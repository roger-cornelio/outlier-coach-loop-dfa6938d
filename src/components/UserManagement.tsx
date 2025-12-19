import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Shield, ShieldCheck, ShieldAlert, Loader2, UserPlus, UserMinus, Dumbbell, Link2, Unlink, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { AdminAllowlistManager } from './AdminAllowlistManager';
import { UserIdentity, UserIdentityCompact, getDisplayName, type UserIdentityData } from './UserIdentity';

interface UserWithRole {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  role: 'superadmin' | 'admin' | 'coach' | 'user';
}

interface CoachAthlete {
  id: string;
  coach_id: string;
  athlete_id: string;
  created_at: string;
}

export function UserManagement() {
  const { setCurrentView } = useOutlierStore();
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [coachAthletes, setCoachAthletes] = useState<CoachAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedCoach, setExpandedCoach] = useState<string | null>(null);
  const [linkingAthlete, setLinkingAthlete] = useState<{ coachId: string; athleteId: string } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchCoachAthletes();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles including name
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Build a map of user roles (prioritize superadmin > admin > coach > user)
      const userRoleMap = new Map<string, 'superadmin' | 'admin' | 'coach' | 'user'>();
      (allRoles || []).forEach(r => {
        const roleStr = String(r.role);
        const currentRole = userRoleMap.get(r.user_id);
        if (roleStr === 'superadmin') {
          userRoleMap.set(r.user_id, 'superadmin');
        } else if (roleStr === 'admin' && currentRole !== 'superadmin') {
          userRoleMap.set(r.user_id, 'admin');
        } else if (roleStr === 'coach' && !['superadmin', 'admin'].includes(currentRole || '')) {
          userRoleMap.set(r.user_id, 'coach');
        }
      });

      const usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        id: p.user_id,
        name: p.name || null,
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

  const fetchCoachAthletes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('coach_athletes')
        .select('*');

      if (error) throw error;
      setCoachAthletes((data || []) as CoachAthlete[]);
    } catch (err) {
      console.error('Error fetching coach athletes:', err);
    }
  };

  const toggleCoachRole = async (userId: string, currentRole: 'superadmin' | 'admin' | 'coach' | 'user') => {
    if (userId === user?.id) {
      toast.error('Você não pode alterar seu próprio acesso');
      return;
    }

    if (currentRole === 'admin' || currentRole === 'superadmin') {
      toast.error('Não é possível alterar administradores por aqui');
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
        
        // Also remove all athlete assignments for this coach
        await (supabase as any)
          .from('coach_athletes')
          .delete()
          .eq('coach_id', userId);
          
        toast.success('Acesso de coach removido');
      } else {
        // Add coach role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'coach' as any });

        if (error) throw error;
        toast.success('Usuário autorizado como coach');
      }

      // Refresh lists
      await fetchUsers();
      await fetchCoachAthletes();
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Erro ao atualizar permissão');
    } finally {
      setUpdating(null);
    }
  };

  const assignAthleteToCoach = async (coachId: string, athleteId: string) => {
    setLinkingAthlete({ coachId, athleteId });
    try {
      const { error } = await (supabase as any)
        .from('coach_athletes')
        .insert({ coach_id: coachId, athlete_id: athleteId });

      if (error) throw error;
      toast.success('Atleta vinculado ao coach');
      await fetchCoachAthletes();
    } catch (err: any) {
      console.error('Error assigning athlete:', err);
      if (err.code === '23505') {
        toast.error('Este atleta já está vinculado a este coach');
      } else {
        toast.error('Erro ao vincular atleta');
      }
    } finally {
      setLinkingAthlete(null);
    }
  };

  const removeAthleteFromCoach = async (coachId: string, athleteId: string) => {
    setLinkingAthlete({ coachId, athleteId });
    try {
      const { error } = await (supabase as any)
        .from('coach_athletes')
        .delete()
        .eq('coach_id', coachId)
        .eq('athlete_id', athleteId);

      if (error) throw error;
      toast.success('Atleta desvinculado do coach');
      await fetchCoachAthletes();
    } catch (err) {
      console.error('Error removing athlete:', err);
      toast.error('Erro ao desvincular atleta');
    } finally {
      setLinkingAthlete(null);
    }
  };

  const getCoachAthletes = (coachId: string) => {
    const athleteIds = coachAthletes
      .filter(ca => ca.coach_id === coachId)
      .map(ca => ca.athlete_id);
    return users.filter(u => athleteIds.includes(u.id));
  };

  const getUnassignedAthletes = (coachId: string) => {
    const assignedIds = coachAthletes
      .filter(ca => ca.coach_id === coachId)
      .map(ca => ca.athlete_id);
    return users.filter(u => u.role === 'user' && !assignedIds.includes(u.id));
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

  const getRoleIcon = (role: 'superadmin' | 'admin' | 'coach' | 'user') => {
    switch (role) {
      case 'superadmin':
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'admin':
        return <ShieldCheck className="w-5 h-5 text-primary" />;
      case 'coach':
        return <Dumbbell className="w-5 h-5 text-green-500" />;
      default:
        return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: 'superadmin' | 'admin' | 'coach' | 'user') => {
    switch (role) {
      case 'superadmin':
        return 'SuperAdmin';
      case 'admin':
        return 'Administrador';
      case 'coach':
        return 'Coach';
      default:
        return 'Atleta';
    }
  };

  const getRoleBorderColor = (role: 'superadmin' | 'admin' | 'coach' | 'user') => {
    switch (role) {
      case 'superadmin':
        return 'border-l-yellow-500';
      case 'admin':
        return 'border-l-primary';
      case 'coach':
        return 'border-l-green-500';
      default:
        return '';
    }
  };

  const coaches = users.filter(u => u.role === 'coach');
  const regularUsers = users.filter(u => u.role === 'user');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('welcome')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl">GERENCIAR PERMISSÕES</h1>
              <p className="text-sm text-muted-foreground">Coaches, atletas e vínculos</p>
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
                <p className="text-2xl font-display">{coaches.length}</p>
                <p className="text-sm text-muted-foreground">Coaches</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Link2 className="w-6 h-6 text-blue-500" />
              <div>
                <p className="text-2xl font-display">{coachAthletes.length}</p>
                <p className="text-sm text-muted-foreground">Vínculos</p>
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
            <strong className="text-primary">Coaches</strong> podem inserir planilhas e ver dados dos atletas vinculados a eles.
            <strong className="text-primary"> Admin</strong> vê todos os dados.
            <strong className="text-foreground"> Usuários</strong> veem apenas seus próprios dados.
          </p>
        </motion.div>

        {/* SuperAdmin Only: Admin Allowlist Manager */}
        {isSuperAdmin && (
          <div className="mb-8">
            <AdminAllowlistManager />
          </div>
        )}

        {/* Coaches Section */}
        {coaches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-green-500" />
              COACHES E ATLETAS VINCULADOS
            </h2>

            <div className="space-y-3">
              {coaches.map((coach) => {
                const coachAthletesList = getCoachAthletes(coach.id);
                const unassigned = getUnassignedAthletes(coach.id);
                const isExpanded = expandedCoach === coach.id;

                return (
                  <motion.div
                    key={coach.id}
                    className="card-elevated rounded-xl border-l-4 border-l-green-500 overflow-hidden"
                  >
                    {/* Coach Header */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => setExpandedCoach(isExpanded ? null : coach.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                          <Dumbbell className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <UserIdentity 
                            user={{ name: coach.name, email: coach.email }} 
                            size="md"
                          />
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {coachAthletesList.length} atleta{coachAthletesList.length !== 1 ? 's' : ''} vinculado{coachAthletesList.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {coach.id !== user?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCoachRole(coach.id, 'coach');
                            }}
                            disabled={updating === coach.id}
                            className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                          >
                            {updating === coach.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remover coach'}
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border"
                        >
                          <div className="p-4 space-y-4">
                            {/* Linked Athletes */}
                            {coachAthletesList.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Atletas vinculados</p>
                                <div className="flex flex-wrap gap-2">
                                  {coachAthletesList.map(athlete => (
                                    <div
                                      key={athlete.id}
                                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-sm"
                                    >
                                      <UserIdentityCompact user={{ name: athlete.name, email: athlete.email }} />
                                      <button
                                        onClick={() => removeAthleteFromCoach(coach.id, athlete.id)}
                                        disabled={linkingAthlete?.athleteId === athlete.id}
                                        className="text-red-500 hover:text-red-400"
                                      >
                                        {linkingAthlete?.athleteId === athlete.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Unlink className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Available Athletes */}
                            {unassigned.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Vincular atleta</p>
                                <div className="flex flex-wrap gap-2">
                                  {unassigned.map(athlete => (
                                    <button
                                      key={athlete.id}
                                      onClick={() => assignAthleteToCoach(coach.id, athlete.id)}
                                      disabled={linkingAthlete?.athleteId === athlete.id}
                                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm transition-colors"
                                    >
                                      {linkingAthlete?.athleteId === athlete.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Link2 className="w-3 h-3 text-green-500" />
                                      )}
                                      <UserIdentityCompact user={{ name: athlete.name, email: athlete.email }} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {coachAthletesList.length === 0 && unassigned.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                Nenhum atleta disponível para vincular
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* All Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="font-display text-xl mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            TODOS OS USUÁRIOS
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
                      u.role === 'superadmin' ? 'bg-yellow-500/20' :
                      u.role === 'admin' ? 'bg-primary/20' : 
                      u.role === 'coach' ? 'bg-green-500/20' : 'bg-secondary'
                    }`}>
                      {getRoleIcon(u.role)}
                    </div>
                    <div>
                      <UserIdentity 
                        user={{ name: u.name, email: u.email }} 
                        size="md"
                      />
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getRoleLabel(u.role)} • Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {u.id === user?.id ? (
                    <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-lg">
                      Você
                    </span>
                  ) : u.role === 'superadmin' ? (
                    <span className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-lg">
                      SuperAdmin
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
