/**
 * LinkAthleteModal - Modal para vincular atleta ao coach por email
 * 
 * Fluxo:
 * 1. Coach digita email do atleta
 * 2. Busca profile pelo email via RPC
 * 3. Valida se é atleta (não coach/admin)
 * 4. Insere em coach_athletes (source of truth)
 * 5. Verifica persistência pós-insert
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLinkDebug } from '@/hooks/useLinkDebug';
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
import { Loader2, UserPlus, AlertCircle, CheckCircle, Copy, Search } from 'lucide-react';

interface LinkAthleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void> | void;
}

export function LinkAthleteModal({ open, onOpenChange, onSuccess }: LinkAthleteModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { setUpsertResult, setVerifyCount } = useLinkDebug();
  
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
  const [linkError, setLinkError] = useState<{
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    payload?: { coach_id?: string; athlete_id?: string };
  } | null>(null);

  const copyErrorToClipboard = () => {
    if (!linkError) return;
    const errorReport = {
      action: 'link_athlete',
      timestamp: new Date().toISOString(),
      supabase_error: {
        code: linkError.code || 'N/A',
        message: linkError.message || 'N/A',
        details: linkError.details || null,
        hint: linkError.hint || null,
      },
      payload: linkError.payload || {},
    };
    const text = JSON.stringify(errorReport, null, 2);
    navigator.clipboard.writeText(text);
    console.error('[LinkAthleteModal] Error report copied:', errorReport);
    toast({ title: 'Erro copiado para clipboard' });
  };

  const resetState = () => {
    setEmail('');
    setSearchResult(null);
    setLinkError(null);
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
    if (!canLink || !searchResult?.user_id) return;

    setIsLoading(true);

    try {
      // Get current user id (coach's auth.uid)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setSearchResult({ status: 'ERROR', message: 'Usuário não autenticado' });
        setUpsertResult(false, 'No authenticated user');
        return;
      }

      console.log('[LinkAthleteModal] Attempting upsert:', { coach_id: user.id, athlete_id: searchResult.user_id });

      // Insert into coach_athletes (source of truth)
      const { data: insertData, error: insertError } = await supabase
        .from('coach_athletes')
        .insert({ coach_id: user.id, athlete_id: searchResult.user_id })
        .select()
        .single();

      if (insertError) {
        const errData = {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          payload: { coach_id: user.id, athlete_id: searchResult.user_id },
        };
        console.error('[LinkAthleteModal] LINK FAILED:', {
          action: 'link_athlete',
          timestamp: new Date().toISOString(),
          supabase_error: errData,
        });
        setUpsertResult(false, insertError.message);
        setLinkError(errData);
        setSearchResult({ 
          status: 'ERROR', 
          message: `Erro: ${insertError.code} - ${insertError.message}` 
        });
        toast({
          title: 'Erro ao vincular',
          description: `${insertError.code}: ${insertError.message}`,
          variant: 'destructive',
        });
        return;
      }

      console.log('[LinkAthleteModal] Insert success:', insertData);
      setUpsertResult(true, null);

      // VERIFICATION: Check if it actually persisted
      const { count, error: countError } = await supabase
        .from('coach_athletes')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user.id)
        .eq('athlete_id', searchResult.user_id);

      const verifyCount = count ?? 0;
      setVerifyCount(verifyCount);

      if (countError) {
        console.error('[LinkAthleteModal] Verify error:', countError);
      }

      console.log('[LinkAthleteModal] Verify count:', verifyCount);

      if (verifyCount === 0) {
        toast({
          title: 'Falha: vínculo não persistiu',
          description: 'O insert retornou sucesso mas a verificação encontrou 0 registros.',
          variant: 'destructive',
        });
        setSearchResult({ status: 'ERROR', message: 'Vínculo não persistiu - verifique RLS' });
        // Não fecha modal em caso de falha
        return;
      }

      toast({
        title: 'Atleta vinculado!',
        description: `${searchResult.name || searchResult.email} agora é seu atleta.`,
      });

      // Aguardar refetch antes de fechar
      await onSuccess();
      handleClose();
    } catch (err) {
      console.error('[LinkAthleteModal] Error:', err);
      setUpsertResult(false, String(err));
      setSearchResult({ status: 'ERROR', message: 'Erro inesperado ao vincular atleta' });
      // Não fecha modal em caso de erro
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
            <div className={`p-3 rounded-lg ${
              searchResult.status === 'ERROR' || searchResult.status === 'NO_AUTH_USER' || 
              searchResult.status === 'NOT_ATHLETE' || searchResult.status === 'ALREADY_LINKED' ||
              searchResult.status === 'ALREADY_YOURS' || searchResult.status === 'INVALID_EMAIL'
                ? 'bg-destructive/10 border border-destructive/20'
                : 'bg-muted'
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  searchResult.status === 'ERROR' || searchResult.status === 'NO_AUTH_USER' || 
                  searchResult.status === 'NOT_ATHLETE' || searchResult.status === 'ALREADY_LINKED' ||
                  searchResult.status === 'ALREADY_YOURS' || searchResult.status === 'INVALID_EMAIL'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`} />
                <p className={`text-sm flex-1 ${
                  searchResult.status === 'ERROR' || searchResult.status === 'NO_AUTH_USER' || 
                  searchResult.status === 'NOT_ATHLETE' || searchResult.status === 'ALREADY_LINKED' ||
                  searchResult.status === 'ALREADY_YOURS' || searchResult.status === 'INVALID_EMAIL'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}>{searchResult.message}</p>
                {linkError && searchResult.status === 'ERROR' && (
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
            <Button onClick={handleLink} disabled={isLoading || !searchResult?.user_id}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Confirmar vínculo
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
