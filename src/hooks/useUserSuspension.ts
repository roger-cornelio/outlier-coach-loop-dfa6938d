import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuspendUserParams {
  targetUserId: string;
  action: 'suspend' | 'reactivate';
}

interface DeleteUserParams {
  targetUserId: string;
  confirmDeletion: boolean;
}

export function useUserSuspension() {
  const [suspending, setSuspending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const suspendUser = async ({ targetUserId, action }: SuspendUserParams): Promise<boolean> => {
    setSuspending(targetUserId);
    try {
      const { data, error } = await supabase.functions.invoke('suspend-user', {
        body: {
          target_user_id: targetUserId,
          action,
        },
      });

      if (error) {
        console.error('[useUserSuspension] Error:', error);
        toast.error(error.message || 'Erro ao atualizar status do usuário');
        return false;
      }

      if (data?.error) {
        console.error('[useUserSuspension] API Error:', data);
        toast.error(data.message || 'Erro ao atualizar status do usuário');
        return false;
      }

      toast.success(action === 'suspend' ? 'Usuário suspenso' : 'Usuário reativado');
      return true;
    } catch (err) {
      console.error('[useUserSuspension] Unexpected error:', err);
      toast.error('Erro inesperado');
      return false;
    } finally {
      setSuspending(null);
    }
  };

  const deleteUser = async ({ targetUserId, confirmDeletion }: DeleteUserParams): Promise<boolean> => {
    if (!confirmDeletion) {
      toast.error('Confirmação necessária');
      return false;
    }

    setDeleting(targetUserId);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          target_user_id: targetUserId,
          confirm_deletion: confirmDeletion,
        },
      });

      if (error) {
        console.error('[useUserSuspension] Delete error:', error);
        toast.error(error.message || 'Erro ao remover usuário');
        return false;
      }

      if (data?.error) {
        console.error('[useUserSuspension] Delete API Error:', data);
        toast.error(data.message || 'Erro ao remover usuário');
        return false;
      }

      toast.success('Usuário removido definitivamente');
      return true;
    } catch (err) {
      console.error('[useUserSuspension] Unexpected delete error:', err);
      toast.error('Erro inesperado');
      return false;
    } finally {
      setDeleting(null);
    }
  };

  return {
    suspendUser,
    deleteUser,
    suspending,
    deleting,
  };
}
