import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, UserPlus, Ban, Loader2, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AdminAllowlistEntry {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

export function AdminAllowlistManager() {
  const { isSuperAdmin } = useAuth();
  const [allowlist, setAllowlist] = useState<AdminAllowlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllowlist();
    }
  }, [isSuperAdmin]);

  const fetchAllowlist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_allowlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllowlist((data || []) as AdminAllowlistEntry[]);
    } catch (err) {
      console.error('Error fetching allowlist:', err);
      toast.error('Erro ao carregar lista de admins');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newEmail.trim()) {
      toast.error('Digite um email válido');
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase.rpc('add_admin_allowlist', {
        _email: newEmail.trim().toLowerCase()
      });

      if (error) throw error;
      
      toast.success('Admin adicionado à lista');
      setNewEmail('');
      await fetchAllowlist();
    } catch (err: any) {
      console.error('Error adding admin:', err);
      toast.error(err.message || 'Erro ao adicionar admin');
    } finally {
      setAdding(false);
    }
  };

  const handleRevokeAdmin = async (email: string, id: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.rpc('revoke_admin_allowlist', {
        _email: email
      });

      if (error) throw error;
      
      toast.success('Acesso de admin revogado');
      await fetchAllowlist();
    } catch (err: any) {
      console.error('Error revoking admin:', err);
      toast.error(err.message || 'Erro ao revogar admin');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReactivateAdmin = async (email: string, id: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.rpc('add_admin_allowlist', {
        _email: email
      });

      if (error) throw error;
      
      toast.success('Admin reativado');
      await fetchAllowlist();
    } catch (err: any) {
      console.error('Error reactivating admin:', err);
      toast.error(err.message || 'Erro ao reativar admin');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  const approvedAdmins = allowlist.filter(a => a.status === 'approved');
  const revokedAdmins = allowlist.filter(a => a.status === 'revoked');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/20">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl">GERENCIAR ADMINS</h2>
          <p className="text-sm text-muted-foreground">Apenas SuperAdmin pode alterar</p>
        </div>
      </div>

      {/* Add Admin Form */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email do novo admin..."
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="pl-10"
            onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
          />
        </div>
        <Button
          onClick={handleAddAdmin}
          disabled={adding || !newEmail.trim()}
          className="gap-2"
        >
          {adding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Approved Admins */}
          {approvedAdmins.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Admins Ativos ({approvedAdmins.length})
              </p>
              <div className="space-y-2">
                {approvedAdmins.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border-l-4 border-l-green-500"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                      <span className="text-foreground">{entry.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeAdmin(entry.email, entry.id)}
                      disabled={updatingId === entry.id}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      {updatingId === entry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revoked Admins */}
          {revokedAdmins.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Revogados ({revokedAdmins.length})
              </p>
              <div className="space-y-2">
                {revokedAdmins.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border-l-4 border-l-muted-foreground opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Ban className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground line-through">{entry.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactivateAdmin(entry.email, entry.id)}
                      disabled={updatingId === entry.id}
                      className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                    >
                      {updatingId === entry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allowlist.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum admin na lista</p>
              <p className="text-sm mt-1">Adicione emails para autorizar novos admins</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground">
          <strong className="text-primary">Importante:</strong> Usuários adicionados à lista terão acesso de admin no próximo login. 
          Revogar remove o acesso no próximo login do usuário.
        </p>
      </div>
    </motion.div>
  );
}
