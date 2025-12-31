import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { useCoachStylePersistence } from '@/hooks/useCoachStylePersistence';
import { useAthleteProfile } from '@/hooks/useAthleteProfile';
import { type TrainingLevel, type SessionDuration, type AthleteConfig as AthleteConfigType } from '@/types/outlier';
import { ArrowLeft, Zap, TrendingUp, Target, AlertCircle, Loader2, User, Check } from 'lucide-react';
import { useAdaptationPipeline } from '@/hooks/useAdaptationPipeline';
import { toast } from 'sonner';
import { CoachStyleChanger } from '@/components/CoachStyleChanger';

// ═══════════════════════════════════════════════════════════════════════════
// MVP0: Níveis OPEN/PRO (ambos mapeiam para 'performance' internamente)
// Isso mantém compatibilidade com o motor de adaptação existente
// ═══════════════════════════════════════════════════════════════════════════
type UITrainingLevel = 'open' | 'pro';

const trainingLevelOptions: { value: UITrainingLevel; label: string; description: string; icon: typeof Zap }[] = [
  { 
    value: 'open', 
    label: 'OPEN', 
    description: 'Treino completo com volume otimizado para competição',
    icon: Target
  },
  { 
    value: 'pro', 
    label: 'PRO', 
    description: 'Intensidade máxima para atletas de elite',
    icon: Zap
  },
];

// Mapeamento UI -> Motor (ambos viram 'performance' no MVP0)
const uiLevelToMotorLevel = (uiLevel: UITrainingLevel): TrainingLevel => 'performance';

// ═══════════════════════════════════════════════════════════════════════════
// MVP0: Tempo apenas 60 ou null (sem limite)
// null = motor não adapta por tempo
// ═══════════════════════════════════════════════════════════════════════════
type UIDuration = 60 | null;

const durationOptions: { value: UIDuration; label: string }[] = [
  { value: 60, label: 'até 60 min' },
  { value: null, label: 'Sem limite' },
];

const sexOptions = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
];

export function AthleteConfig() {
  const { coachStyle, athleteConfig, setAthleteConfig, setCurrentView, baseWorkouts } = useOutlierStore();
  const { profile, refreshProfile } = useAuth();
  const { isSetupCompleted } = useCoachStylePersistence();
  const { generateAdaptedWorkouts, hasBaseWorkouts } = useAdaptationPipeline();
  const { saveProfileConfig, updateName, isSaving: isSavingProfile } = useAthleteProfile();
  
  // REGRA MESTRA: Detectar primeiro setup APENAS via first_setup_completed
  // NÃO usar inferência de coach_style ou outros campos
  const isFirstSetup = profile?.first_setup_completed !== true;
  const [isSaving, setIsSaving] = useState(false);
  
  // Nome do atleta
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [nameError, setNameError] = useState('');
  
  // Use existing values as defaults
  // MVP0: UI usa 'open'/'pro', mas internamente persiste 'performance'
  const [uiTrainingLevel, setUITrainingLevel] = useState<UITrainingLevel>('open');
  const [duration, setDuration] = useState<UIDuration>(60);
  const [altura, setAltura] = useState(athleteConfig?.altura?.toString() || '');
  const [peso, setPeso] = useState(athleteConfig?.peso?.toString() || '');
  const [idade, setIdade] = useState(athleteConfig?.idade?.toString() || '');
  const [sexo, setSexo] = useState<'masculino' | 'feminino'>(athleteConfig?.sexo || 'masculino');

  // Atualizar campos quando profile ou athleteConfig mudar
  useEffect(() => {
    if (profile?.name && !displayName) {
      setDisplayName(profile.name);
    }
  }, [profile?.name]);

  useEffect(() => {
    if (athleteConfig) {
      // MVP0: Não há mapeamento reverso de performance -> open/pro
      // Mantém 'open' como default ao carregar
      if (athleteConfig.sessionDuration) {
        // Converte valores antigos para o novo formato
        if (athleteConfig.sessionDuration === 'ilimitado' || athleteConfig.sessionDuration === null) {
          setDuration(null);
        } else if (typeof athleteConfig.sessionDuration === 'number') {
          setDuration(athleteConfig.sessionDuration === 60 ? 60 : 60); // Normaliza para 60
        }
      }
      if (athleteConfig.altura) setAltura(athleteConfig.altura.toString());
      if (athleteConfig.peso) setPeso(athleteConfig.peso.toString());
      if (athleteConfig.idade) setIdade(athleteConfig.idade.toString());
      if (athleteConfig.sexo) setSexo(athleteConfig.sexo);
    }
  }, [athleteConfig]);

  // Validar nome
  const validateName = (name: string): boolean => {
    if (!name || name.trim().length < 2) {
      setNameError('Nome deve ter pelo menos 2 caracteres');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!coachStyle) {
      toast.error('Selecione um estilo de coach primeiro');
      return;
    }

    // Validar nome se foi alterado
    if (displayName !== profile?.name && !validateName(displayName)) {
      return;
    }

    setIsSaving(true);

    // ═══════════════════════════════════════════════════════════════════════
    // MVP0: LOGS DE CONFIRMAÇÃO (OBRIGATÓRIO)
    // ═══════════════════════════════════════════════════════════════════════
    const motorLevel = uiLevelToMotorLevel(uiTrainingLevel);
    const motorDuration = duration; // null = sem limite, 60 = até 60 min
    
    console.info(`[AthleteConfig] Nível (UI): ${uiTrainingLevel.toUpperCase()}`);
    console.info(`[AthleteConfig] Nível (persistido): ${motorLevel}`);
    console.info(`[AthleteConfig] Tempo disponível (persistido): ${motorDuration}`);

    // Converter para o tipo SessionDuration esperado pelo motor
    const sessionDurationForMotor: SessionDuration = motorDuration === null ? 'ilimitado' : 60;

    const newConfig: AthleteConfigType = {
      trainingLevel: motorLevel, // CRÍTICO: Persiste 'performance' para o motor
      sessionDuration: sessionDurationForMotor,
      unavailableEquipment: athleteConfig?.unavailableEquipment || [],
      equipmentNotes: athleteConfig?.equipmentNotes || '',
      coachStyle,
      altura: altura ? parseInt(altura) : undefined,
      peso: peso ? parseFloat(peso) : undefined,
      idade: idade ? parseInt(idade) : undefined,
      sexo,
    };
    
    // Atualizar store local
    setAthleteConfig(newConfig);

    // Persistir no banco de dados
    // CRÍTICO: saveProfileConfig seta first_setup_completed = true
    const nameToSave = displayName !== profile?.name ? displayName.trim() : undefined;
    const saved = await saveProfileConfig(newConfig, nameToSave);
    
    if (saved) {
      toast.success('Configurações salvas!');
      // IMPORTANTE: Atualizar profile no contexto de auth para refletir first_setup_completed
      await refreshProfile?.();
    } else {
      toast.error('Erro ao salvar configurações');
      setIsSaving(false);
      return; // Não prosseguir se falhou ao salvar
    }

    // Gerar treino adaptado se houver planilha base
    if (hasBaseWorkouts) {
      const result = generateAdaptedWorkouts({ overrideConfig: newConfig });
      if (result.success) {
        toast.success('Treino calibrado para você!');
      }
    }

    setIsSaving(false);
    
    // SEMPRE ir para preWorkout após salvar configuração
    // (tanto no primeiro setup quanto em edições posteriores, o preWorkout é o ritual de entrada)
    console.log(`[NAV][AthleteConfig] from_view=config to_view=preWorkout first_setup_completed=${profile?.first_setup_completed} isFirstSetup=${isFirstSetup} coachStyle=${coachStyle} reason=config_saved_go_to_preworkout ts=${new Date().toISOString()}`);
    setCurrentView('preWorkout');
  };

  return (
    <div className="min-h-screen px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        {/* Só mostra botão voltar se NÃO for primeiro setup */}
        {!isFirstSetup && (
          <button
            onClick={() => setCurrentView('dashboard')}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="font-display text-4xl">{isFirstSetup ? 'CONFIGURE SEU TREINO' : 'CONFIGURAÇÃO'}</h1>
          <p className="text-muted-foreground">{isFirstSetup ? 'Personalize sua experiência' : 'Ajuste seu treino'}</p>
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

      {/* Coach Style Changer */}
      <CoachStyleChanger />

      {/* Perfil / Nome de Exibição */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          PERFIL
        </h2>
        <div className="max-w-md">
          <label className="block text-sm text-muted-foreground mb-2">Nome de exibição</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (nameError) validateName(e.target.value);
            }}
            placeholder="Seu nome"
            minLength={2}
            maxLength={50}
            className={`w-full px-4 py-3 rounded-lg bg-secondary border font-body text-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50 ${
              nameError ? 'border-destructive' : 'border-border'
            }`}
          />
          {nameError && (
            <p className="text-sm text-destructive mt-1">{nameError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Este nome aparecerá no app e para seu coach.
          </p>
        </div>
      </motion.section>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {trainingLevelOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setUITrainingLevel(option.value)}
                className={`
                  p-4 rounded-lg border transition-all duration-200 text-left
                  ${uiTrainingLevel === option.value
                    ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/30'
                    : 'border-border bg-card hover:border-muted-foreground/50'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${uiTrainingLevel === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
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

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full font-display text-xl tracking-wider px-8 py-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-3 disabled:opacity-70"
        >
          {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
          {isSaving 
            ? 'SALVANDO...' 
            : isFirstSetup 
              ? 'COMEÇAR MEU TREINO' 
              : hasBaseWorkouts 
                ? 'GERAR TREINO ADAPTADO' 
                : 'SALVAR CONFIGURAÇÃO'
          }
        </button>
      </motion.div>
    </div>
  );
}
