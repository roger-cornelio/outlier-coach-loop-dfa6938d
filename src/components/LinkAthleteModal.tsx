/**
 * LinkAthleteModal - Modal para vincular atleta ao coach por email
 * 
 * Fluxo:
 * 1. Coach digita email do atleta
 * 2. Busca profile pelo email
 * 3. Valida se é role='user' (atleta)
 * 4. Valida se não está vinculado a outro coach
 * 5. Seta profiles.coach_id = currentCoachId
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

interface LinkAthleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LinkAthleteModal({ open, onOpenChange, onSuccess }: LinkAthleteModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundAthlete, setFoundAthlete] = useState<{
    id: string;
    user_id: string;
    name: string | null;
    email: string;
    coach_id: string | null;
  } | null>(null);

  const resetState = () => {
    setEmail('');
    setError(null);
    setFoundAthlete(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Digite o email do atleta');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFoundAthlete(null);

    try {
      // Buscar profile pelo email (case-insensitive)
      const { data: athleteProfile, error: searchError } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, coach_id')
        .ilike('email', email.trim())
        .maybeSingle();

      if (searchError) {
        console.error('[LinkAthleteModal] Search error:', searchError);
        setError('Erro ao buscar atleta');
        return;
      }

      if (!athleteProfile) {
        setError('Nenhum usuário encontrado com esse email');
        return;
      }

      // Verificar se já é o próprio coach
      if (athleteProfile.id === profile?.id) {
        setError('Você não pode vincular a si mesmo');
        return;
      }

      // Verificar se é coach (coaches não podem ser vinculados como atletas)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', athleteProfile.user_id);

      const isCoachOrAdmin = roles?.some(r => r.role === 'coach' || r.role === 'admin' || r.role === 'superadmin');
      if (isCoachOrAdmin) {
        setError('Este usuário é coach/admin e não pode ser vinculado como atleta');
        return;
      }

      // Verificar se já está vinculado a outro coach
      if (athleteProfile.coach_id && athleteProfile.coach_id !== profile?.id) {
        setError('Este atleta já está vinculado a outro coach');
        return;
      }

      // Se já está vinculado a este coach
      if (athleteProfile.coach_id === profile?.id) {
        setError('Este atleta já está vinculado a você');
        return;
      }

      setFoundAthlete(athleteProfile);
    } catch (err) {
      console.error('[LinkAthleteModal] Error:', err);
      setError('Erro inesperado ao buscar atleta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLink = async () => {
    if (!foundAthlete || !profile?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Atualizar coach_id no profile do atleta
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coach_id: profile.id })
        .eq('id', foundAthlete.id);

      if (updateError) {
        console.error('[LinkAthleteModal] Update error:', updateError);
        setError('Erro ao vincular atleta');
        return;
      }

      toast({
        title: 'Atleta vinculado!',
        description: `${foundAthlete.name || foundAthlete.email} agora é seu atleta.`,
      });

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('[LinkAthleteModal] Error:', err);
      setError('Erro inesperado ao vincular atleta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Vincular Atleta
          </DialogTitle>
          <DialogDescription>
            Digite o email do atleta para vinculá-lo à sua conta de coach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campo de email */}
          <div className="space-y-2">
            <Label htmlFor="athlete-email">Email do Atleta</Label>
            <div className="flex gap-2">
              <Input
                id="athlete-email"
                type="email"
                placeholder="atleta@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={isLoading || !!foundAthlete}
              />
              {!foundAthlete && (
                <Button onClick={handleSearch} disabled={isLoading || !email.trim()}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Buscar'
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Atleta encontrado */}
          {foundAthlete && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {foundAthlete.name || 'Sem nome'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {foundAthlete.email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {foundAthlete && (
            <Button onClick={handleLink} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Vincular Atleta
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
