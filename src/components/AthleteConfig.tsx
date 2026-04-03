import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { useCoachStylePersistence } from '@/hooks/useCoachStylePersistence';
import { useAthleteProfile } from '@/hooks/useAthleteProfile';
import { supabase } from '@/integrations/supabase/client';
import { type PlanTier, type SessionDuration, type AthleteConfig as AthleteConfigType } from '@/types/outlier';
import { ArrowLeft, AlertCircle, User, Trophy, TrendingUp, MessageCircle, Crown, Loader2, Users, RefreshCw, Wrench, Check } from 'lucide-react';
import { useAdaptationPipeline } from '@/hooks/useAdaptationPipeline';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { CoachStyleChanger } from '@/components/CoachStyleChanger';
import { getCoachDisplayName } from '@/utils/displayName';
import { ChangeCoachModal } from '@/components/ChangeCoachModal';

// ═══════════════════════════════════════════════════════════════════════════
// PLANO CONTRATADO (OPEN / PRO)
// Este campo NÃO influencia o treino do dia. É apenas o tipo de assinatura.
// O atleta não pode alterar diretamente - precisa falar com o coach.
// ═══════════════════════════════════════════════════════════════════════════

const PLAN_DISPLAY: Record<PlanTier, { label: string; icon: typeof TrendingUp; description: string }> = {
  open: {
    label: 'ESSENCIAL',
    icon: TrendingUp,
    description: 'Plano de evolução contínua'
  },
  pro: {
    label: 'PERFORMANCE',
    icon: Trophy,
    description: 'Plano para alta performance'
  }
};

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
  const { saveProfileConfig, updateName, isSaving: isSavingProfile, resetAthleteData } = useAthleteProfile();
  
  // REGRA MESTRA: Detectar primeiro setup APENAS via first_setup_completed
  // NÃO usar inferência de coach_style ou outros campos
  const isFirstSetup = profile?.first_setup_completed !== true;
  const [isSaving, setIsSaving] = useState(false);
  
  // Nome do atleta
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [nameError, setNameError] = useState('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PLANO CONTRATADO (read-only)
  // Lê do athleteConfig para exibição, mas NÃO permite alteração
  // ═══════════════════════════════════════════════════════════════════════════
  const getCurrentPlanTier = (): PlanTier => {
    const tier = athleteConfig?.planTier || athleteConfig?.trainingLevel;
    if (tier === 'pro') return 'pro';
    return 'open'; // Default visual
  };
  
  const currentPlan = getCurrentPlanTier();

  const [duration, setDuration] = useState<UIDuration>(() => {
    if (athleteConfig?.sessionDuration === 'ilimitado') return null;
    if (athleteConfig?.sessionDuration === 60) return 60;
    return 60;
  });
  const [altura, setAltura] = useState(athleteConfig?.altura?.toString() || '');
  const [peso, setPeso] = useState(athleteConfig?.peso?.toString() || '');
  const [idade, setIdade] = useState(athleteConfig?.idade?.toString() || '');
  const [unavailableEquipment, setUnavailableEquipment] = useState<string[]>(athleteConfig?.unavailableEquipment || []);
  const [equipmentNotes, setEquipmentNotes] = useState(athleteConfig?.equipmentNotes || '');
  const [sexo, setSexo] = useState<'masculino' | 'feminino'>(athleteConfig?.sexo || 'masculino');

  // Nome do coach vinculado
  const [coachName, setCoachName] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [showChangeCoach, setShowChangeCoach] = useState(false);
  const { user } = useAuth();

  // Plan change request state
  const [pendingPlanRequest, setPendingPlanRequest] = useState<{ requested_plan: string; status: string } | null>(null);
  const [submittingPlanRequest, setSubmittingPlanRequest] = useState(false);

  // Fetch pending plan change request
  useEffect(() => {
    const fetchPendingRequest = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('plan_change_requests')
        .select('requested_plan, status')
        .eq('athlete_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setPendingPlanRequest(data as any);
    };
    fetchPendingRequest();
  }, [user?.id]);

  const handleRequestPlanChange = async (requestedTier: PlanTier) => {
    if (!user?.id || submittingPlanRequest) return;
    setSubmittingPlanRequest(true);
    try {
      // Get coach_id from coach_athletes
      const { data: link } = await supabase
        .from('coach_athletes')
        .select('coach_id')
        .eq('athlete_id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('plan_change_requests')
        .insert({
          athlete_user_id: user.id,
          coach_id: link?.coach_id || null,
          current_plan: currentPlan,
          requested_plan: requestedTier,
        });
      if (error) throw error;
      setPendingPlanRequest({ requested_plan: requestedTier, status: 'pending' });
      const isUpgrade = requestedTier === 'pro';
      toast.success(
        isUpgrade
          ? 'Solicitação de upgrade enviada ao seu coach!'
          : 'Solicitação de downgrade enviada ao seu coach!'
      );
    } catch (err) {
      console.error('[AthleteConfig] Plan request error:', err);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setSubmittingPlanRequest(false);
    }
  };

  // Buscar nome do coach vinculado via tabela coach_athletes
  useEffect(() => {
    const fetchCoachName = async () => {
      if (!user?.id) {
        setCoachLoading(false);
        setCoachName(null);
        return;
      }
      
      setCoachLoading(true);
      
      try {
        // Buscar vínculo na tabela coach_athletes (fonte de verdade)
        // coach_athletes usa user_id (auth ID) para athlete_id e coach_id
        const { data: linkData, error: linkError } = await supabase
          .from('coach_athletes')
          .select('coach_id')
          .eq('athlete_id', user.id)
          .maybeSingle();
        
        if (linkError) {
          // RLS pode estar bloqueando - atletas talvez não tenham permissão para ler coach_athletes
          console.warn('[AthleteConfig] Não foi possível buscar vínculo:', linkError.message);
          setCoachName(null);
          setCoachLoading(false);
          return;
        }
        
        if (!linkData?.coach_id) {
          // Atleta não está vinculado a nenhum coach
          setCoachName(null);
          setCoachLoading(false);
          return;
        }
        
        // Buscar nome do coach (coach_id é um user_id)
        const { data: coachProfile, error: coachError } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', linkData.coach_id)
          .maybeSingle();
        
        if (coachError) {
          console.warn('[AthleteConfig] Não foi possível buscar perfil do coach:', coachError.message);
          setCoachName(null);
        } else if (coachProfile) {
          // Usar função utilitária para extrair nome de exibição (não email)
          setCoachName(getCoachDisplayName(coachProfile));
        } else {
          setCoachName(null);
        }
      } catch (err) {
        console.error('[AthleteConfig] Erro ao buscar coach:', err);
        setCoachName(null);
      } finally {
        setCoachLoading(false);
      }
    };
    
    fetchCoachName();
  }, [user?.id]);

  // Atualizar campos quando profile mudar
  useEffect(() => {
    if (profile?.name && !displayName) {
      setDisplayName(profile.name);
    }
  }, [profile?.name]);

  useEffect(() => {
    if (athleteConfig) {
      if (athleteConfig.sessionDuration) {
        if (athleteConfig.sessionDuration === 'ilimitado' || athleteConfig.sessionDuration === null) {
          setDuration(null);
        } else if (typeof athleteConfig.sessionDuration === 'number') {
          setDuration(athleteConfig.sessionDuration === 60 ? 60 : 60);
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
    // NOTA: PlanTier NÃO é salvo nesta tela (read-only)
    // Apenas tempo disponível e dados biométricos são salvos
    // ═══════════════════════════════════════════════════════════════════════
    const motorDuration = duration;
    console.info(`[AthleteConfig] Tempo disponível: ${motorDuration}`);

    const sessionDurationForMotor: SessionDuration = motorDuration === null ? 'ilimitado' : 60;

    const newConfig: AthleteConfigType = {
      // Mantém o planTier atual (read-only nesta tela)
      planTier: currentPlan,
      trainingLevel: currentPlan, // Legacy compatibility
      sessionDuration: sessionDurationForMotor,
      unavailableEquipment,
      equipmentNotes,
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
    
    // REGRA: Se o nome mudou, tratar como "novo atleta" — limpar todos os dados
    if (nameToSave && user?.id) {
      toast.loading('Atualizando identidade do atleta...', { id: 'identity-reset' });
      
      // 1. Deletar dados do banco
      await resetAthleteData(user.id);
      
      // 2. Resetar store local (treinos, resultados, etc.)
      const { resetToDefaults } = useOutlierStore.getState();
      resetToDefaults();
      
      // 3. Restaurar config recém-criada e coach style
      setAthleteConfig(newConfig);
      if (coachStyle) {
        useOutlierStore.getState().setCoachStyle(coachStyle);
      }
      
      toast.dismiss('identity-reset');
    }
    
    const saved = await saveProfileConfig(newConfig, nameToSave);
    
    if (saved) {
      toast.success(nameToSave ? 'Identidade atualizada! Dados resetados.' : 'Configurações salvas!');
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
    
    // SEMPRE ir para dashboard após salvar configuração
    // NOTE: preWorkout foi removido como etapa intermediária
    console.log(`[NAV][AthleteConfig] from_view=config to_view=dashboard first_setup_completed=${profile?.first_setup_completed} isFirstSetup=${isFirstSetup} coachStyle=${coachStyle} reason=config_saved_go_to_dashboard ts=${new Date().toISOString()}`);
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen px-3 sm:px-6 py-4 sm:py-8 max-w-4xl mx-auto">
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
          
          {/* Coach vinculado */}
          <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Coach</span>
                  {coachLoading ? (
                    <p className="text-base font-medium text-foreground/60">Carregando...</p>
                  ) : coachName ? (
                    <p className="text-base font-semibold text-foreground">{coachName}</p>
                  ) : (
                    <p className="text-base font-medium text-muted-foreground">Não vinculado</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowChangeCoach(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Trocar coach</span>
              </button>
              <ChangeCoachModal
                open={showChangeCoach}
                onClose={() => setShowChangeCoach(false)}
                currentCoachName={coachName}
                onChanged={() => {
                  setCoachName(null);
                  setCoachLoading(true);
                  // Re-fetch coach name
                  refreshProfile?.();
                  setTimeout(() => {
                    setCoachName('Pendente...');
                    setCoachLoading(false);
                  }, 500);
                }}
              />
            </div>
          </div>
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

      {/* Equipment Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl mb-2 flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" />
          EQUIPAMENTOS DO MEU BOX
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Marque o que você <strong>NÃO</strong> tem. Seu coach será notificado para adaptar o treino.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { id: 'sled', label: 'Sled (Push/Pull)', emoji: '🛷' },
            { id: 'skierg', label: 'SkiErg', emoji: '⛷️' },
            { id: 'rower', label: 'Remo (Row)', emoji: '🚣' },
            { id: 'bike', label: 'Bike / Assault Bike', emoji: '🚴' },
          ].map((item) => {
            const isSelected = unavailableEquipment.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() =>
                  setUnavailableEquipment((prev) =>
                    prev.includes(item.id) ? prev.filter((e) => e !== item.id) : [...prev, item.id]
                  )
                }
                className={`
                  p-3 rounded-lg border-2 transition-all duration-200 
                  flex items-center gap-2 text-left
                  ${isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/30 hover:border-muted-foreground/50'
                  }
                `}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="font-display text-sm flex-1">{item.label}</span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-2">Outros (descreva o que falta)</label>
          <Textarea
            value={equipmentNotes}
            onChange={(e) => setEquipmentNotes(e.target.value)}
            placeholder="Ex: não tenho wall ball de 9kg, box sem corda naval..."
            className="bg-secondary border-border"
            rows={3}
          />
        </div>
      </motion.section>

      {/* Plan Tier Display (Read-Only) */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl mb-2 flex items-center gap-2">
          <Crown className="w-6 h-6 text-primary" />
          SEU PLANO
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Plano contratado com seu coach. Para alterar, fale com seu coach.
        </p>
        
        {/* Dois botões de plano lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          {(['open', 'pro'] as PlanTier[]).map((tier) => {
            const info = PLAN_DISPLAY[tier];
            const Icon = info.icon;
            const isCurrent = currentPlan === tier;
            const isUpgrade = tier === 'pro' && currentPlan === 'open';
            const hasPendingForThis = pendingPlanRequest?.requested_plan === tier;
            const isDisabled = !!pendingPlanRequest || submittingPlanRequest;
            
            return (
              <button
                key={tier}
                disabled={isCurrent || isDisabled}
                onClick={() => {
                  if (!isCurrent && !isDisabled) {
                    handleRequestPlanChange(tier);
                  }
                }}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition-all duration-200 ${
                  isCurrent
                    ? 'border-primary bg-primary/10'
                    : hasPendingForThis
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-border bg-card hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <Icon className={`w-6 h-6 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`font-display text-lg ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {info.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isCurrent ? 'Plano atual' : hasPendingForThis ? 'Solicitado' : isUpgrade ? 'Solicitar upgrade' : 'Solicitar downgrade'}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Banner de solicitação pendente */}
        {pendingPlanRequest && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-200">
              {pendingPlanRequest.requested_plan === 'pro'
                ? '⬆️ Upgrade para PERFORMANCE solicitado — aguardando aprovação do coach'
                : '⬇️ Downgrade para ESSENCIAL solicitado — aguardando aprovação do coach'}
            </p>
          </div>
        )}
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
