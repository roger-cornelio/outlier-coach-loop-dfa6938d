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
  const [searchResult, setSearchResult] = useState<{
    status: string;
    message: string;
    profile_id?: string;
    user_id?: string;
    name?: string;
    email?: string;
    coach_id?: string;
  } | null>(null);

  const resetState = () => {
    setEmail('');
    setSearchResult(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSearch = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail) {
      setSearchResult({ status: 'INVALID_EMAIL', message: 'Digite o email do atleta' });
      return;
    }

    setIsLoading(true);
    setSearchResult(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('coach_find_athlete_by_email', { _email: normalizedEmail });

      if (rpcError) {
        console.error('[LinkAthleteModal] RPC error:', rpcError);
        setSearchResult({ status: 'ERROR', message: 'Erro ao buscar atleta' });
        return;
      }

      // data is jsonb, cast to our type
      const result = data as {
        status: string;
        message: string;
        profile_id?: string;
        user_id?: string;
        name?: string;
        email?: string;
        coach_id?: string;
      };
      setSearchResult(result);
    } catch (err) {
      console.error('[LinkAthleteModal] Error:', err);
      setSearchResult({ status: 'ERROR', message: 'Erro inesperado ao buscar atleta' });
    } finally {
      setIsLoading(false);
    }
  };

  const canLink = searchResult?.status === 'OK' || searchResult?.status === 'PROFILE_CREATED';

  const handleLink = async () => {
    if (!canLink || !searchResult?.profile_id || !profile?.id) return;

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coach_id: profile.id })
        .eq('id', searchResult.profile_id);

      if (updateError) {
        console.error('[LinkAthleteModal] Update error:', updateError);
        setSearchResult({ status: 'ERROR', message: 'Erro ao vincular atleta' });
        return;
      }

      toast({
        title: 'Atleta vinculado!',
        description: `${searchResult.name || searchResult.email} agora é seu atleta.`,
      });

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('[LinkAthleteModal] Error:', err);
      setSearchResult({ status: 'ERROR', message: 'Erro inesperado ao vincular atleta' });
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
                disabled={isLoading || canLink}
              />
              {!canLink && (
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

          {/* Status messages */}
          {searchResult && !canLink && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              searchResult.status === 'ERROR' || searchResult.status === 'NO_AUTH_USER' || 
              searchResult.status === 'NOT_ATHLETE' || searchResult.status === 'ALREADY_LINKED' ||
              searchResult.status === 'ALREADY_YOURS' || searchResult.status === 'INVALID_EMAIL'
                ? 'bg-destructive/10 border border-destructive/20'
                : 'bg-muted'
            }`}>
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${
                searchResult.status === 'ERROR' || searchResult.status === 'NO_AUTH_USER' || 
                searchResult.status === 'NOT_ATHLETE' || searchResult.status === 'ALREADY_LINKED' ||
                searchResult.status === 'ALREADY_YOURS' || searchResult.status === 'INVALID_EMAIL'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`} />
              <p className={`text-sm ${
                searchResult.status === 'ERROR' || searchResult.status === 'NO_AUTH_USER' || 
                searchResult.status === 'NOT_ATHLETE' || searchResult.status === 'ALREADY_LINKED' ||
                searchResult.status === 'ALREADY_YOURS' || searchResult.status === 'INVALID_EMAIL'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}>{searchResult.message}</p>
            </div>
          )}

          {/* Profile created message */}
          {searchResult?.status === 'PROFILE_CREATED' && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {searchResult.message}
              </p>
            </div>
          )}

          {/* Atleta encontrado */}
          {canLink && searchResult && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {searchResult.name || 'Sem nome'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {searchResult.email}
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
          {canLink && (
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
