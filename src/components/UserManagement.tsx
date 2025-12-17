import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Shield, ShieldCheck, ShieldAlert, Loader2, UserPlus, UserMinus, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: 'admin' | 'coach' | 'user';
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

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Build a map of user roles (prioritize admin > coach > user)
      const userRoleMap = new Map<string, 'admin' | 'coach' | 'user'>();
      (allRoles || []).forEach(r => {
        const roleStr = String(r.role);
        const currentRole = userRoleMap.get(r.user_id);
        if (roleStr === 'admin') {
          userRoleMap.set(r.user_id, 'admin');
        } else if (roleStr === 'coach' && currentRole !== 'admin') {
          userRoleMap.set(r.user_id, 'coach');
        }
      });

      const usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        id: p.user_id,
        email: p.email || 'Email não disponível',
        created_at: p.created_at,
        role: userRoleMap.get(p.user_id) || 'user',
      }));

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const toggleCoachRole = async (userId: string, currentRole: 'admin' | 'coach' | 'user') => {
    if (userId === user?.id) {
      toast.error('Você não pode alterar seu próprio acesso');
      return;
    }

    if (currentRole === 'admin') {
      toast.error('Não é possível remover outro administrador');
      return;
    }

    setUpdating(userId);
    try {
      if (currentRole === 'coach') {
        // Remove coach role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .filter('role', 'eq', 'coach');

        if (error) throw error;
        toast.success('Acesso de coach removido');
      } else {
        // Add coach role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'coach' as any });

        if (error) throw error;
        toast.success('Usuário autorizado como coach');
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
            Apenas o administrador pode gerenciar coaches.
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

  const getRoleIcon = (role: 'admin' | 'coach' | 'user') => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-5 h-5 text-primary" />;
      case 'coach':
        return <Dumbbell className="w-5 h-5 text-green-500" />;
      default:
        return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: 'admin' | 'coach' | 'user') => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'coach':
        return 'Coach';
      default:
        return 'Usuário';
    }
  };

  const getRoleBorderColor = (role: 'admin' | 'coach' | 'user') => {
    switch (role) {
      case 'admin':
        return 'border-l-primary';
      case 'coach':
        return 'border-l-green-500';
      default:
        return '';
    }
  };

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
              <h1 className="font-display text-2xl">GERENCIAR COACHES</h1>
              <p className="text-sm text-muted-foreground">Autorizar ou remover coaches</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="card-elevated p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-muted-foreground" />
              <div>
                <p className="text-2xl font-display">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Dumbbell className="w-6 h-6 text-green-500" />
              <div>
                <p className="text-2xl font-display">{users.filter(u => u.role === 'coach').length}</p>
                <p className="text-sm text-muted-foreground">Coaches</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <div>
                <p className="text-2xl font-display">{users.filter(u => u.role === 'admin').length}</p>
                <p className="text-sm text-muted-foreground">Admin</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20"
        >
          <p className="text-sm text-muted-foreground">
            <strong className="text-primary">Coaches</strong> podem inserir planilhas de treino. 
            Apenas você (<strong>Admin</strong>) pode autorizar novos coaches.
          </p>
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
                    u.role !== 'user' ? `border-l-4 ${getRoleBorderColor(u.role)}` : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      u.role === 'admin' ? 'bg-primary/20' : 
                      u.role === 'coach' ? 'bg-green-500/20' : 'bg-secondary'
                    }`}>
                      {getRoleIcon(u.role)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRoleLabel(u.role)} • Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {u.id === user?.id ? (
                    <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-lg">
                      Você
                    </span>
                  ) : u.role === 'admin' ? (
                    <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-lg">
                      Admin
                    </span>
                  ) : (
                    <button
                      onClick={() => toggleCoachRole(u.id, u.role)}
                      disabled={updating === u.id}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                        u.role === 'coach'
                          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                      }`}
                    >
                      {updating === u.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : u.role === 'coach' ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          Remover coach
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Autorizar coach
                        </>
                      )}
                    </button>
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
