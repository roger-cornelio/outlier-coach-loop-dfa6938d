/**
 * AthleteSettings - Tela de Configurações
 * 
 * Responsabilidades:
 * - Conta
 * - Preferências
 */

import { useState } from 'react';
import { Settings, User, LogOut, Shield, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AthleteSettings() {
  const navigate = useNavigate();
  const { user, signOut, isAdmin, isCoach } = useAuth();
  const { athleteConfig, setCurrentView } = useOutlierStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) throw error;
      toast.success('Logout realizado');
      navigate('/login');
    } catch (error) {
      toast.error('Erro ao sair');
    } finally {
      setSigningOut(false);
    }
  };

  const handleEditProfile = () => {
    setCurrentView('config');
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-muted-foreground" />
        <h1 className="text-2xl font-display tracking-wide">Configurações</h1>
      </div>

      {/* Account Section */}
      <section className="mb-8">
        <h2 className="text-lg font-display mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Conta
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-4 space-y-4"
        >
          {/* Email */}
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="font-medium">{user?.email || 'Não conectado'}</p>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm text-muted-foreground">Nome</label>
            <p className="font-medium">{user?.user_metadata?.name || 'Não definido'}</p>
          </div>

          {/* Role Badge */}
          {(isAdmin || isCoach) && (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">
                {isAdmin ? 'Administrador' : 'Coach'}
              </span>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleEditProfile}
          >
            Editar Perfil
          </Button>
        </motion.div>
      </section>

      {/* Preferences Section */}
      <section className="mb-8">
        <h2 className="text-lg font-display mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Preferências
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-elevated p-4 space-y-4"
        >
          {/* Coach Style */}
          <div>
            <label className="text-sm text-muted-foreground">Estilo de Coach</label>
            <p className="font-medium capitalize">{athleteConfig?.coachStyle || 'PULSE'}</p>
          </div>

          {/* Training Level */}
          <div>
            <label className="text-sm text-muted-foreground">Nível de Treino</label>
            <p className="font-medium capitalize">{athleteConfig?.trainingLevel || 'Não definido'}</p>
          </div>

          {/* Session Duration */}
          <div>
            <label className="text-sm text-muted-foreground">Duração da Sessão</label>
            <p className="font-medium capitalize">{athleteConfig?.sessionDuration || 'Não definido'}</p>
          </div>
        </motion.div>
      </section>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {signingOut ? 'Saindo...' : 'Sair da Conta'}
        </Button>
      </motion.div>
    </div>
  );
}
