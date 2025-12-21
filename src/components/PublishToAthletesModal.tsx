/**
 * PublishToAthletesModal - Modal para publicar treino para atletas vinculados
 * 
 * REGRAS OBRIGATÓRIAS:
 * 1. Selecionar atletas (obrigatório)
 * 2. Selecionar data de agendamento (obrigatório - scheduled_date)
 * 3. Confirmar e publicar
 * 
 * O treino só aparece no quadro semanal do atleta na scheduled_date.
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DayWorkout } from '@/types/outlier';
import { cn } from '@/lib/utils';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Send, Users, User, CheckCircle, AlertCircle, Copy, 
  CalendarIcon, ChevronRight, ChevronLeft 
} from 'lucide-react';

interface LinkedAthlete {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
}

interface PublishToAthletesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workouts: DayWorkout[];
  title: string;
  linkedAthletes: LinkedAthlete[];
  loadingAthletes?: boolean;
  onSuccess?: () => void;
}

// Step enum for the wizard
type PublishStep = 'athletes' | 'date' | 'confirm';

export function PublishToAthletesModal({ 
  open, 
  onOpenChange, 
  workouts, 
  title,
  linkedAthletes,
  loadingAthletes = false,
  onSuccess 
}: PublishToAthletesModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const athletes = linkedAthletes;
  const isLoading = loadingAthletes;
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<PublishStep>('athletes');
  
  // Selection state
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  
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
      console.log('[PublishToAthletesModal] Modal opened with athletes:', linkedAthletes);
      setSelectedAthletes(new Set(linkedAthletes.map(a => a.user_id)));
      setScheduledDate(undefined);
      setCurrentStep('athletes');
      setPublishedCount(0);
      setError(null);
      setErrorData(null);
    }
  }, [open, linkedAthletes]);

  const handleClose = () => {
    setSelectedAthletes(new Set());
    setScheduledDate(undefined);
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

  const handleNext = () => {
    if (currentStep === 'athletes' && selectedAthletes.size > 0) {
      setCurrentStep('date');
    } else if (currentStep === 'date' && scheduledDate) {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'date') {
      setCurrentStep('athletes');
    } else if (currentStep === 'confirm') {
      setCurrentStep('date');
    }
  };

  const handlePublish = async () => {
    if (!profile?.id || selectedAthletes.size === 0 || !scheduledDate) return;

    setIsPublishing(true);
    setError(null);
    setPublishedCount(0);

    const scheduledDateStr = format(scheduledDate, 'yyyy-MM-dd');
    // Week start is still used for the unique constraint, but scheduled_date is what matters for display
    const weekStart = getWeekStartFromDate(scheduledDate);
    
    let successCount = 0;
    const errors: Array<{ athleteId: string; error: any }> = [];

    try {
      for (const athleteUserId of selectedAthletes) {
        const payload = {
          athlete_user_id: athleteUserId,
          coach_id: profile.id,
          week_start: weekStart,
          scheduled_date: scheduledDateStr,
          plan_json: { workouts },
          title: title || `Treino ${scheduledDateStr}`,
          status: 'published',
          published_at: new Date().toISOString(),
        };

        console.log('[PublishToAthletesModal] Insert payload:', {
          athlete_user_id: payload.athlete_user_id,
          coach_id: payload.coach_id,
          scheduled_date: payload.scheduled_date,
          week_start: payload.week_start,
          status: payload.status,
        });

        // Insert instead of upsert to allow multiple workouts per week
        const { error: insertError } = await supabase
          .from('athlete_plans')
          .insert(payload as any);

        if (insertError) {
          console.error('[PublishToAthletesModal] Insert FAILED for athlete:', athleteUserId, {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
          });
          errors.push({ athleteId: athleteUserId, error: insertError });
        } else {
          console.log('[PublishToAthletesModal] Insert SUCCESS for athlete:', athleteUserId);
          successCount++;
        }
      }

      setPublishedCount(successCount);

      if (successCount > 0) {
        toast({
          title: 'Treino agendado!',
          description: `Publicado para ${successCount} atleta(s) em ${format(scheduledDate, 'dd/MM/yyyy')}.`,
        });
        onSuccess?.();
        
        if (errors.length === 0) {
          setTimeout(() => {
            handleClose();
          }, 1500);
        }
      }

      if (errors.length > 0) {
        const firstError = errors[0].error;
        const errorDetails = [
          `Erro ao publicar para ${errors.length} atleta(s).`,
          `Código: ${firstError.code || 'N/A'}`,
          `Mensagem: ${firstError.message || 'Erro desconhecido'}`,
          firstError.hint ? `Hint: ${firstError.hint}` : null,
          firstError.details ? `Detalhes: ${firstError.details}` : null,
        ].filter(Boolean).join('\n');
        
        setError(errorDetails);
        setErrorData({
          code: firstError.code,
          message: firstError.message,
          details: firstError.details,
          hint: firstError.hint,
          athleteIds: errors.map(e => e.athleteId),
          payload: {
            athlete_user_id: errors[0]?.athleteId,
            coach_id: profile?.id,
            scheduled_date: scheduledDateStr,
          },
        });
        
        toast({
          title: 'Erro ao publicar',
          description: `${firstError.code}: ${firstError.message}`,
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

  // Step indicators
  const steps = [
    { key: 'athletes', label: 'Atletas', completed: selectedAthletes.size > 0 },
    { key: 'date', label: 'Data', completed: !!scheduledDate },
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

      case 'date':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Selecione a data em que o treino deve aparecer no calendário dos atletas.
              </p>
            </div>
            
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={scheduledDate}
                onSelect={setScheduledDate}
                locale={ptBR}
                className={cn("rounded-md border pointer-events-auto")}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>

            {scheduledDate && (
              <div className="text-center">
                <p className="text-sm font-medium text-primary">
                  Data selecionada: {format(scheduledDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
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
                  {scheduledDate && format(scheduledDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {title || 'Treino sem título'}
                </span>
              </div>
            </div>

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
      case 'date':
        return !!scheduledDate;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Publicar Treino
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'athletes' && 'Selecione os atletas que receberão este treino.'}
            {currentStep === 'date' && 'Escolha a data de agendamento (obrigatório).'}
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

        <div className="py-4 min-h-[280px]">
          {renderStepContent()}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <div>
            {currentStep !== 'athletes' && (
              <Button 
                variant="outline" 
                onClick={handleBack} 
                disabled={isPublishing}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
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
                <ChevronRight className="w-4 h-4 ml-1" />
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

// Helper: Get week start (Monday) from a given date
function getWeekStartFromDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}