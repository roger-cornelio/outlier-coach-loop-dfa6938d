import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Shield, ShieldCheck, ShieldAlert, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  isAdmin: boolean;
}

export function UserManagement() {
  const { setCurrentView } = useOutlierStore();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        id: p.user_id,
        email: p.email || 'Email não disponível',
        created_at: p.created_at,
        isAdmin: adminUserIds.has(p.user_id),
      }));

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    if (userId === user?.id) {
      toast.error('Você não pode remover seu próprio acesso admin');
      return;
    }

    setUpdating(userId);
    try {
      if (currentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success('Acesso admin removido');
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
        toast.success('Usuário promovido a admin');
      }

      // Refresh list
      await fetchUsers();
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Erro ao atualizar permissão');
    } finally {
      setUpdating(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-primary/60" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">Acesso negado</h1>
          <p className="text-muted-foreground mb-6">
            Apenas administradores podem gerenciar usuários.
          </p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="w-full px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('admin')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl">GERENCIAR USUÁRIOS</h1>
              <p className="text-sm text-muted-foreground">Promover ou remover administradores</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          <div className="card-elevated p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <div>
                <p className="text-2xl font-display">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total de usuários</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-green-500" />
              <div>
                <p className="text-2xl font-display">{users.filter(u => u.isAdmin).length}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* User List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-display text-xl mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            USUÁRIOS CADASTRADOS
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="card-elevated p-8 rounded-xl text-center">
              <p className="text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`card-elevated p-4 rounded-xl flex items-center justify-between ${
                    u.isAdmin ? 'border-l-4 border-l-green-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${u.isAdmin ? 'bg-green-500/20' : 'bg-secondary'}`}>
                      {u.isAdmin ? (
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                      ) : (
                        <Shield className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.isAdmin ? 'Administrador' : 'Usuário'} • Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {u.id !== user?.id && (
                    <button
                      onClick={() => toggleAdminRole(u.id, u.isAdmin)}
                      disabled={updating === u.id}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                        u.isAdmin
                          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                      }`}
                    >
                      {updating === u.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : u.isAdmin ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          Remover admin
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Tornar admin
                        </>
                      )}
                    </button>
                  )}

                  {u.id === user?.id && (
                    <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-lg">
                      Você
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
