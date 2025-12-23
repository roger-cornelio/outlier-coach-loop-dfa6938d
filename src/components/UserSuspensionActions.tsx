import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, UserX, UserCheck, Trash2, AlertTriangle } from 'lucide-react';
import { useUserSuspension } from '@/hooks/useUserSuspension';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserSuspensionActionsProps {
  userId: string;
  userName: string | null;
  userEmail: string;
  userStatus: 'active' | 'suspended';
  isAdmin: boolean;
  isCoach: boolean;
  onActionComplete: () => void;
}

export function UserSuspensionActions({
  userId,
  userName,
  userEmail,
  userStatus,
  isAdmin,
  isCoach,
  onActionComplete,
}: UserSuspensionActionsProps) {
  const { suspendUser, deleteUser, suspending, deleting } = useUserSuspension();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const displayName = userName || userEmail.split('@')[0];
  const isSuspended = userStatus === 'suspended';

  const handleSuspendToggle = async () => {
    const success = await suspendUser({
      targetUserId: userId,
      action: isSuspended ? 'reactivate' : 'suspend',
    });
    if (success) {
      onActionComplete();
    }
  };

  const handleDelete = async () => {
    const success = await deleteUser({
      targetUserId: userId,
      confirmDeletion: true,
    });
    if (success) {
      setShowDeleteDialog(false);
      onActionComplete();
    }
  };

  const isLoading = suspending === userId || deleting === userId;

  return (
    <div className="flex items-center gap-2">
      {/* Suspend/Reactivate Button - Available to both Admin and Coach */}
      <button
        onClick={handleSuspendToggle}
        disabled={isLoading}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
          isSuspended
            ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
            : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
        }`}
        title={isSuspended ? 'Reativar usuário' : 'Suspender usuário'}
      >
        {suspending === userId ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isSuspended ? (
          <>
            <UserCheck className="w-3 h-3" />
            Reativar
          </>
        ) : (
          <>
            <UserX className="w-3 h-3" />
            Suspender
          </>
        )}
      </button>

      {/* Delete Button - Admin Only */}
      {isAdmin && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogTrigger asChild>
            <button
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              title="Remover definitivamente"
            >
              {deleting === userId ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  Remover
                </>
              )}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-full bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <AlertDialogTitle className="text-xl">Remover Definitivamente</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-left space-y-3">
                <p>
                  Você está prestes a remover <strong className="text-foreground">{displayName}</strong> ({userEmail}) de forma <strong className="text-red-500">DEFINITIVA</strong>.
                </p>
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm">
                  <p className="font-medium text-red-500 mb-1">Esta ação irá apagar:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    <li>Conta de acesso</li>
                    <li>Perfil e configurações</li>
                    <li>Histórico de treinos</li>
                    <li>Resultados de benchmarks</li>
                    <li>Vínculos com coaches</li>
                  </ul>
                </div>
                <p className="text-red-500 font-medium">
                  ⚠️ Esta ação NÃO pode ser desfeita!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white"
                disabled={deleting === userId}
              >
                {deleting === userId ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Sim, remover definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Suspended Badge */}
      {isSuspended && (
        <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wide bg-orange-500/20 text-orange-500 font-medium">
          Suspenso
        </span>
      )}
    </div>
  );
}

// Coach-specific version (no delete button)
export function CoachSuspensionActions({
  userId,
  userName,
  userEmail,
  userStatus,
  onActionComplete,
}: Omit<UserSuspensionActionsProps, 'isAdmin' | 'isCoach'>) {
  return (
    <UserSuspensionActions
      userId={userId}
      userName={userName}
      userEmail={userEmail}
      userStatus={userStatus}
      isAdmin={false}
      isCoach={true}
      onActionComplete={onActionComplete}
    />
  );
}
