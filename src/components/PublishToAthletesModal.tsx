/**
 * PublishToAthletesModal - Modal para publicar treino para atletas vinculados
 * 
 * Permite selecionar atletas específicos ou todos para receber a planilha processada.
 * Faz upsert em athlete_plans pela chave (athlete_user_id + week_start).
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DayWorkout } from '@/types/outlier';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Users, User, CheckCircle, AlertCircle, Copy } from 'lucide-react';

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
  linkedAthletes: LinkedAthlete[]; // FONTE ÚNICA - passada pelo parent
  loadingAthletes?: boolean;
  onSuccess?: () => void;
}

// Calcula o início da semana (segunda-feira)
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para segunda
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

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
  
  // Usa a lista passada pelo parent - FONTE ÚNICA
  const athletes = linkedAthletes;
  const isLoading = loadingAthletes;
  
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorData, setErrorData] = useState<{
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    athleteIds?: string[];
    payload?: { athlete_user_id?: string; coach_id?: string; week_start?: string };
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

  // Log ao abrir para QA
  useEffect(() => {
    if (open) {
      console.log('[PublishToAthletesModal] Modal opened with athletes:', linkedAthletes);
      // Selecionar todos por padrão quando abrir
      setSelectedAthletes(new Set(linkedAthletes.map(a => a.user_id)));
    }
  }, [open, linkedAthletes]);

  const handleClose = () => {
    setSelectedAthletes(new Set());
    setPublishedCount(0);
    setError(null);
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

  const handlePublish = async () => {
    if (!profile?.id || selectedAthletes.size === 0) return;

    setIsPublishing(true);
    setError(null);
    setPublishedCount(0);

    const weekStart = getWeekStart();
    let successCount = 0;
    const errors: Array<{ athleteId: string; error: any }> = [];

    try {
      // Publicar para cada atleta selecionado
      for (const athleteUserId of selectedAthletes) {
        const payload = {
          athlete_user_id: athleteUserId,
          coach_id: profile.id,
          week_start: weekStart,
          plan_json: { workouts },
          title: title || `Semana ${weekStart}`,
          status: 'published',
          published_at: new Date().toISOString(),
        };

        // Log payload para debug
        console.log('[PublishToAthletesModal] Upsert payload:', {
          athlete_user_id: payload.athlete_user_id,
          coach_id: payload.coach_id,
          week_start: payload.week_start,
          status: payload.status,
          published_at: payload.published_at,
          plan_json_size: JSON.stringify(payload.plan_json).length,
        });

        const { error: upsertError } = await (supabase as any)
          .from('athlete_plans')
          .upsert(payload, {
            onConflict: 'athlete_user_id,week_start'
          });

        if (upsertError) {
          console.error('[PublishToAthletesModal] Upsert FAILED for athlete:', athleteUserId, {
            code: upsertError.code,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
          });
          errors.push({ athleteId: athleteUserId, error: upsertError });
        } else {
          console.log('[PublishToAthletesModal] Upsert SUCCESS for athlete:', athleteUserId);
          successCount++;
        }
      }

      setPublishedCount(successCount);

      if (successCount > 0) {
        toast({
          title: 'Treino publicado!',
          description: `Enviado para ${successCount} atleta(s).`,
        });
        onSuccess?.();
        
        // Fechar modal após sucesso (só se não houve erros)
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
          `Atletas afetados: ${errors.map(e => e.athleteId.slice(0, 8)).join(', ')}...`,
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
            week_start: weekStart,
          },
        });

        // Console error com detalhes completos
        console.error('[PublishToAthletesModal] PUBLISH FAILED:', {
          action: 'publish_plan',
          timestamp: new Date().toISOString(),
          supabase_error: {
            code: firstError.code,
            message: firstError.message,
            details: firstError.details,
            hint: firstError.hint,
          },
          payload: { coach_id: profile?.id, week_start: weekStart },
          affected_athletes: errors.map(e => e.athleteId),
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Publicar para Atletas
          </DialogTitle>
          <DialogDescription>
            Selecione os atletas que receberão este treino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* QA Debug info */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded font-mono">
            linkedAthletes.length: {athletes.length} | loading: {isLoading ? 'true' : 'false'}
          </div>
          
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Sem atletas */}
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

          {/* Lista de atletas */}
          {!isLoading && athletes.length > 0 && (
            <>
              {/* Selecionar todos */}
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

              <ScrollArea className="max-h-[250px]">
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

          {/* Erro */}
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

          {/* Sucesso */}
          {publishedCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-500">
                Publicado para {publishedCount} atleta(s)!
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePublish} 
            disabled={isPublishing || selectedAthletes.size === 0 || athletes.length === 0}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publicar ({selectedAthletes.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
