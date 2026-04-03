/**
 * PublishToAthletesModal - Modal para publicar treino para atletas vinculados
 * 
 * REGRAS OBRIGATÓRIAS:
 * 1. Selecionar atletas (obrigatório)
 * 2. A semana de publicação vem de weekStart (segunda-feira da semana)
 * 3. Confirmar e publicar
 * 
 * O treino aparece no quadro semanal do atleta na semana correspondente.
 */

import { useState, useEffect } from 'react';
import { format, addDays, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DayWorkout } from '@/types/outlier';
import { cn } from '@/lib/utils';
import { normalizeWorkoutsForPersistence } from '@/utils/workoutSerialization';
import { computeStationEmphasis, type StationEmphasis } from '@/utils/diagnosticProportionEngine';
import type { DiagnosticoMelhoria } from '@/components/diagnostico/types';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Send, Users, User, CheckCircle, AlertCircle, Copy, 
  CalendarIcon, Sliders, TrendingUp
} from 'lucide-react';

interface LinkedAthlete {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
}

export interface PublishToAthletesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workouts: DayWorkout[];
  title: string;
  linkedAthletes: LinkedAthlete[];
  loadingAthletes?: boolean;
  onSuccess?: () => void;
  /** Segunda-feira da semana (YYYY-MM-DD) - fonte única da verdade */
  weekStart: string | null;
  /** ID do workout na tabela workouts (para atualizar status para published) */
  workoutId?: string | null;
}

// Step enum for the wizard - 3 steps: athletes → adaptation review → confirm
type PublishStep = 'athletes' | 'adaptation' | 'confirm';

export function PublishToAthletesModal({ 
  open, 
  onOpenChange, 
  workouts, 
  title,
  linkedAthletes,
  loadingAthletes = false,
  onSuccess,
  weekStart,
  workoutId,
}: PublishToAthletesModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const athletes = linkedAthletes;
  const isLoading = loadingAthletes;
  
  // Wizard state - sem step de data
  const [currentStep, setCurrentStep] = useState<PublishStep>('athletes');
  
  // Selection state
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  
  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorData, setErrorData] = useState<{
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    athleteIds?: string[];
    payload?: { athlete_user_id?: string; coach_id?: string; scheduled_date?: string };
  } | null>(null);
  const [publishedCount, setPublishedCount] = useState(0);
  const [athletesWithExistingPlan, setAthletesWithExistingPlan] = useState<Set<string>>(new Set());
  
  // Adaptation state
  const [athleteAdaptations, setAthleteAdaptations] = useState<Map<string, {
    enabled: boolean;
    emphasis: StationEmphasis[];
    athleteName: string;
  }>>(new Map());
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  // Calcula o período da semana a partir de weekStart
  const weekPeriodLabel = weekStart 
    ? (() => {
        const monday = parseISO(weekStart);
        const sunday = addDays(monday, 6);
        return `${format(monday, 'dd/MM', { locale: ptBR })} → ${format(sunday, 'dd/MM', { locale: ptBR })}`;
      })()
    : null;

  /**
   * Verifica se a semana é passada (apenas para aviso informativo, não bloqueante)
   */
  const isWeekInPast = (): boolean => {
    if (!weekStart) return false;
    
    const weekStartDate = parseISO(weekStart);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calcular início da semana atual (segunda-feira)
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    // Normalizar para comparação
    weekStartDate.setHours(0, 0, 0, 0);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    return weekStartDate.getTime() < currentWeekStart.getTime();
  };

  // Publicação permitida se tem week_start (sem bloqueio por data)
  const canPublish = Boolean(weekStart);

  const copyErrorToClipboard = () => {
    if (!errorData) return;
    const errorReport = {
      action: 'publish_plan',
      timestamp: new Date().toISOString(),
      supabase_error: {
        code: errorData.code || 'N/A',
        message: errorData.message || 'N/A',
        details: errorData.details || null,
        hint: errorData.hint || null,
      },
      payload: errorData.payload || {},
      affected_athletes: errorData.athleteIds || [],
    };
    const text = JSON.stringify(errorReport, null, 2);
    navigator.clipboard.writeText(text);
    console.error('[PublishToAthletesModal] Error report copied:', errorReport);
    toast({ title: 'Erro copiado para clipboard' });
  };

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      console.log('[PublishToAthletesModal] Modal opened with athletes:', linkedAthletes, 'weekStart:', weekStart);
      setSelectedAthletes(new Set(linkedAthletes.map(a => a.user_id)));
      setCurrentStep('athletes');
      setPublishedCount(0);
      setError(null);
      setErrorData(null);
      setAthletesWithExistingPlan(new Set());
    }
  }, [open, linkedAthletes, weekStart]);

  // Verificar quais atletas já têm plano na mesma semana
  useEffect(() => {
    const checkExistingPlans = async () => {
      if (!open || !weekStart || selectedAthletes.size === 0) {
        setAthletesWithExistingPlan(new Set());
        return;
      }

      const { data: existingPlans } = await supabase
        .from('athlete_plans')
        .select('athlete_user_id')
        .eq('week_start', weekStart)
        .in('athlete_user_id', Array.from(selectedAthletes));

      if (existingPlans && existingPlans.length > 0) {
        const existingSet = new Set(existingPlans.map(p => p.athlete_user_id));
        setAthletesWithExistingPlan(existingSet);
        console.log('[PublishToAthletesModal] Athletes with existing plans:', existingSet);
      } else {
        setAthletesWithExistingPlan(new Set());
      }
    };

    checkExistingPlans();
  }, [open, weekStart, selectedAthletes]);

  const handleClose = () => {
    setSelectedAthletes(new Set());
    setCurrentStep('athletes');
    setPublishedCount(0);
    setError(null);
    setErrorData(null);
    onOpenChange(false);
  };

  const toggleAthlete = (userId: string) => {
    setSelectedAthletes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedAthletes.size === athletes.length) {
      setSelectedAthletes(new Set());
    } else {
      setSelectedAthletes(new Set(athletes.map(a => a.user_id)));
    }
  };

  const handleNext = async () => {
    if (currentStep === 'athletes' && selectedAthletes.size > 0) {
      // Fetch diagnostics for selected athletes
      setLoadingDiagnostics(true);
      try {
        const athleteIds = Array.from(selectedAthletes);
        const { data: diagnosticos } = await supabase
          .from('diagnostico_melhoria')
          .select('*')
          .in('atleta_id', athleteIds);
        
        const newAdaptations = new Map<string, {
          enabled: boolean;
          emphasis: StationEmphasis[];
          athleteName: string;
        }>();
        
        for (const athleteId of athleteIds) {
          const athleteDiags = (diagnosticos || []).filter(d => d.atleta_id === athleteId);
          const athlete = athletes.find(a => a.user_id === athleteId);
          const athleteName = athlete?.name || athlete?.email || athleteId;
          
          if (athleteDiags.length > 0) {
            const mapped: DiagnosticoMelhoria[] = athleteDiags.map(d => ({
              id: d.id,
              movement: d.movement,
              metric: d.metric,
              value: d.value,
              your_score: d.your_score,
              top_1: d.top_1,
              improvement_value: d.improvement_value,
              percentage: d.percentage,
              total_improvement: d.total_improvement,
            }));
            const emphasis = computeStationEmphasis(mapped);
            newAdaptations.set(athleteId, {
              enabled: true,
              emphasis,
              athleteName,
            });
          } else {
            newAdaptations.set(athleteId, {
              enabled: false,
              emphasis: [],
              athleteName,
            });
          }
        }
        
        setAthleteAdaptations(newAdaptations);
      } catch (err) {
        console.error('[PublishToAthletesModal] Error fetching diagnostics:', err);
      } finally {
        setLoadingDiagnostics(false);
      }
      setCurrentStep('adaptation');
    } else if (currentStep === 'adaptation') {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'confirm') {
      setCurrentStep('adaptation');
    } else if (currentStep === 'adaptation') {
      setCurrentStep('athletes');
    }
  };

  const toggleAdaptation = (athleteId: string) => {
    setAthleteAdaptations(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(athleteId);
      if (current) {
        newMap.set(athleteId, { ...current, enabled: !current.enabled });
      }
      return newMap;
    });
  };

  const handlePublish = async () => {
    // Validação simples: week_start e atletas
    if (!weekStart) {
      setError('Semana não definida. Salve a programação com uma semana selecionada.');
      return;
    }

    if (selectedAthletes.size === 0) {
      setError('Selecione pelo menos um atleta.');
      return;
    }

    if (!workouts || workouts.length === 0) {
      setError('Nenhum treino para publicar.');
      return;
    }

    // Validar categoria em dias não-descanso (prioridade automática — sem validação de Principal)
    let daysWithMissingCategory = 0;

    for (const day of workouts) {
      const isRestDay = day.isRestDay === true;
      if (isRestDay) continue;

      if (!day.blocks || day.blocks.length === 0) continue;

      const blocksWithoutCategory = day.blocks.filter((b) => !b.type).length;
      if (blocksWithoutCategory > 0) daysWithMissingCategory++;
    }

    if (daysWithMissingCategory > 0) {
      setError(`${daysWithMissingCategory} dia(s) com blocos sem categoria. Volte e ajuste.`);
      return;
    }

    if (!profile?.id) {
      setError('Dados incompletos. Perfil não encontrado.');
      return;
    }

    setIsPublishing(true);
    setError(null);
    setPublishedCount(0);

    // ════════════════════════════════════════════════════════════════════════════
    // AUDITORIA DE COMENTÁRIOS (coachNotes) - OBRIGATÓRIO PARA DEBUG
    // ════════════════════════════════════════════════════════════════════════════
    const coachNotesTotal = workouts.reduce((total, day) => {
      return total + (day.blocks || []).reduce((blockTotal, block) => {
        const notes = block.coachNotes || [];
        return blockTotal + notes.length;
      }, 0);
    }, 0);

    // LOG: PUBLISH_ATTEMPT (antes de iniciar)
    console.log('[PUBLISH] coachNotesTotal=', coachNotesTotal);
    console.log('PUBLISH_ATTEMPT', {
      week_start: weekStart,
      athleteCount: selectedAthletes.size,
      coachId: profile.id,
      title: title || `Treino Semana ${weekPeriodLabel}`,
      coachNotesTotal,
    });

    let successCount = 0;
    const errors: Array<{ athleteId: string; error: any }> = [];

    try {
      for (const athleteUserId of selectedAthletes) {
        // NORMALIZAÇÃO: Garantir que durationSec seja persistido
        const normalizedWorkouts = normalizeWorkoutsForPersistence(workouts);

        // ════════════════════════════════════════════════════════════════════════
        // MERGE: Buscar plano existente e mesclar dias (não sobrescrever tudo)
        // ════════════════════════════════════════════════════════════════════════
        let mergedWorkouts = normalizedWorkouts;

        const { data: existingPlan } = await supabase
          .from('athlete_plans')
          .select('plan_json')
          .eq('athlete_user_id', athleteUserId)
          .eq('week_start', weekStart)
          .maybeSingle();

        if (existingPlan?.plan_json) {
          const existingJson = existingPlan.plan_json as any;
          const existingWorkouts: any[] = existingJson?.workouts || [];

          if (existingWorkouts.length > 0) {
            // Chaves dos dias sendo publicados agora (day + session para deduplicação)
            const newDayKeys = new Set(
              normalizedWorkouts.map((w: any) => {
                const dayKey = w.day || w.dayLabel || w.scheduledDate;
                const session = w.session || 1;
                return `${dayKey}__s${session}`;
              })
            );

            // Manter dias antigos que NÃO estão na nova publicação
            const keptFromExisting = existingWorkouts.filter(
              (w: any) => {
                const dayKey = w.day || w.dayLabel || w.scheduledDate;
                const session = w.session || 1;
                return !newDayKeys.has(`${dayKey}__s${session}`);
              }
            );

            mergedWorkouts = [...keptFromExisting, ...normalizedWorkouts];

            console.log('[PUBLISH] Merge result:', {
              athleteId: athleteUserId,
              existingDays: existingWorkouts.map((w: any) => w.day || w.dayLabel),
              newDays: Array.from(newDayKeys),
              keptDays: keptFromExisting.map((w: any) => w.day || w.dayLabel),
              totalAfterMerge: mergedWorkouts.length,
            });
          }
        }

        const payload = {
          athlete_user_id: athleteUserId,
          coach_id: profile.id,
          week_start: weekStart, // YYYY-MM-DD string (segunda-feira)
          scheduled_date: weekStart,
          plan_json: { workouts: mergedWorkouts },
          title: title || `Treino Semana ${weekPeriodLabel}`,
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // UPSERT REAL: usa onConflict para criar ou atualizar
        const { error: upsertError } = await supabase
          .from('athlete_plans')
          .upsert(payload as any, { 
            onConflict: 'athlete_user_id,week_start',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error('PUBLISH_FAIL', {
            week_start: weekStart,
            athleteId: athleteUserId,
            errorCode: upsertError.code,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
          });
          errors.push({ athleteId: athleteUserId, error: upsertError });
        } else {
          successCount++;
        }
      }

      setPublishedCount(successCount);

      // LOG: PUBLISH_SUCCESS (se teve algum sucesso)
      if (successCount > 0) {
        console.log('PUBLISH_SUCCESS', {
          week_start: weekStart,
          athleteCount: successCount,
          workoutId: workoutId,
        });

        // CRÍTICO: Atualizar status do workout para 'published' na tabela workouts
        if (workoutId) {
          console.log('PUBLISH_WORKOUT_STATUS_UPDATE', {
            workoutId,
            newStatus: 'published',
          });
          
          const { error: workoutUpdateError } = await supabase
            .from('workouts')
            .update({ 
              status: 'published',
              updated_at: new Date().toISOString(),
            })
            .eq('id', workoutId);
          
          if (workoutUpdateError) {
            console.error('PUBLISH_WORKOUT_STATUS_FAIL', {
              workoutId,
              error: workoutUpdateError,
            });
          } else {
            console.log('PUBLISH_WORKOUT_STATUS_SUCCESS', {
              workoutId,
              newStatus: 'published',
            });
          }
        }

        toast({
          title: 'Treino publicado!',
          description: `Publicado para ${successCount} atleta(s) - Semana ${weekPeriodLabel}.`,
        });
        onSuccess?.();
        
        if (errors.length === 0) {
          setTimeout(() => {
            handleClose();
          }, 1500);
        }
      }

      if (errors.length > 0) {
        // Mensagem user-friendly sem detalhes técnicos
        const humanMessage = `Não foi possível publicar para ${errors.length} atleta(s). Tente novamente.`;
        
        // Log detalhado no console para debug
        const firstError = errors[0].error;
        console.error('[PublishToAthletesModal] Publication errors:', {
          count: errors.length,
          firstError: {
            code: firstError.code,
            message: firstError.message,
            details: firstError.details,
            hint: firstError.hint,
          },
          athleteIds: errors.map(e => e.athleteId),
        });
        
        setError(humanMessage);
        setErrorData({
          code: firstError.code,
          message: firstError.message,
          details: firstError.details,
          hint: firstError.hint,
          athleteIds: errors.map(e => e.athleteId),
          payload: {
            athlete_user_id: errors[0]?.athleteId,
            coach_id: profile?.id,
            scheduled_date: weekStart,
          },
        });
        
        toast({
          title: 'Erro ao publicar',
          description: humanMessage,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('[PublishToAthletesModal] Exception:', err);
      const errorMsg = err?.message || String(err);
      setError(`Exceção: ${errorMsg}`);
      toast({
        title: 'Erro inesperado',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const allSelected = selectedAthletes.size === athletes.length && athletes.length > 0;
  const someSelected = selectedAthletes.size > 0 && selectedAthletes.size < athletes.length;

  // Step indicators - 3 steps
  const steps = [
    { key: 'athletes', label: 'Atletas', completed: selectedAthletes.size > 0 },
    { key: 'adaptation', label: 'Adaptação', completed: currentStep === 'confirm' },
    { key: 'confirm', label: 'Confirmar', completed: publishedCount > 0 },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 'athletes':
        return (
          <div className="space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && athletes.length === 0 && (
              <div className="text-center py-6">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem atletas vinculados.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vincule atletas na aba "Atletas" primeiro.
                </p>
              </div>
            )}

            {!isLoading && athletes.length > 0 && (
              <>
                {/* Mostrar semana que será publicada */}
                {weekPeriodLabel && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        Semana: {weekPeriodLabel}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 pb-2 border-b border-border">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Selecionar todos ({athletes.length})
                  </Label>
                </div>

                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {athletes.map((athlete) => (
                      <div
                        key={athlete.user_id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
                      >
                        <Checkbox
                          id={`athlete-${athlete.user_id}`}
                          checked={selectedAthletes.has(athlete.user_id)}
                          onCheckedChange={() => toggleAthlete(athlete.user_id)}
                        />
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <Label 
                          htmlFor={`athlete-${athlete.user_id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="font-medium text-sm">
                            {athlete.name || athlete.email}
                          </p>
                          {athlete.name && (
                            <p className="text-xs text-muted-foreground">
                              {athlete.email}
                            </p>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        );

      case 'adaptation':
        return (
          <div className="space-y-4">
            {loadingDiagnostics ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando diagnósticos...</span>
              </div>
            ) : (
              <>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      Adaptação por Diagnóstico
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ajuste automático de volume baseado nos pontos fracos de cada atleta. Ligue ou desligue por atleta.
                  </p>
                </div>

                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    {Array.from(athleteAdaptations.entries()).map(([athleteId, data]) => (
                      <div
                        key={athleteId}
                        className="p-3 rounded-lg border border-border bg-card space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{data.athleteName}</span>
                          </div>
                          {data.emphasis.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`adapt-${athleteId}`} className="text-xs text-muted-foreground">
                                {data.enabled ? 'Ativo' : 'Desligado'}
                              </Label>
                              <Switch
                                id={`adapt-${athleteId}`}
                                checked={data.enabled}
                                onCheckedChange={() => toggleAdaptation(athleteId)}
                              />
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Sem diagnóstico
                            </Badge>
                          )}
                        </div>

                        {data.emphasis.length > 0 && data.enabled && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {data.emphasis
                              .filter(e => e.multiplier !== 1.0)
                              .sort((a, b) => b.multiplier - a.multiplier)
                              .map(e => (
                                <Badge
                                  key={e.movement}
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    e.multiplier > 1
                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                      : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                  )}
                                >
                                  {e.movement} {e.label}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {selectedAthletes.size} atleta(s) selecionado(s)
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  Semana: {weekPeriodLabel || 'Não definida'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {title || 'Treino sem título'}
                </span>
              </div>
            </div>

            {/* Aviso quando semana não definida */}
            {!weekStart && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600">
                    Semana não definida. Salve a programação com uma semana selecionada antes de publicar.
                  </p>
                </div>
              </div>
            )}

            {/* Aviso informativo quando semana passada (não bloqueante) */}
            {weekStart && isWeekInPast() && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-600">
                    ℹ️ Esta semana já passou. O atleta não verá este treino automaticamente na navegação.
                  </p>
                </div>
              </div>
            )}

            {/* Aviso informativo quando substituirá treino existente */}
            {weekStart && athletesWithExistingPlan.size > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600">
                    ℹ️ Este treino substituirá o treino atual desta semana para {athletesWithExistingPlan.size} atleta(s) selecionado(s).
                  </p>
                </div>
              </div>
            )}
            {/* Confirmação quando pode publicar */}
            {canPublish && !error && publishedCount === 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-600">
                    Tudo certo! Clique em "Publicar" para enviar o treino para os atletas selecionados.
                  </p>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <pre className="text-xs text-destructive whitespace-pre-wrap flex-1 font-mono">{error}</pre>
                  {errorData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyErrorToClipboard}
                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/20"
                      title="Copiar erro"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Success display */}
            {publishedCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-500">
                  Publicado para {publishedCount} atleta(s)!
                </p>
              </div>
            )}
          </div>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'athletes':
        return selectedAthletes.size > 0 && athletes.length > 0;
      case 'confirm':
        return canPublish;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Publicar Treino
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'athletes' && 'Selecione os atletas que receberão este treino.'}
            {currentStep === 'confirm' && 'Confirme os dados antes de publicar.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                  currentStep === step.key 
                    ? "bg-primary text-primary-foreground" 
                    : step.completed 
                      ? "bg-green-500 text-white" 
                      : "bg-muted text-muted-foreground"
                )}
              >
                {step.completed && currentStep !== step.key ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  step.completed ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-[280px]">
          <div className="py-4 pr-4">
            {renderStepContent()}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-between gap-2">
          <div>
            {currentStep !== 'athletes' && (
              <Button 
                variant="outline" 
                onClick={handleBack} 
                disabled={isPublishing}
              >
                Voltar
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
              Cancelar
            </Button>
            
            {currentStep !== 'confirm' ? (
              <Button 
                onClick={handleNext} 
                disabled={!canProceed()}
              >
                Próximo
              </Button>
            ) : (
              <Button 
                onClick={handlePublish} 
                disabled={isPublishing || !canProceed()}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publicar
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
