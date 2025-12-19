/**
 * AthleteViewSelector - Permite que admin/superadmin visualize o app como um atleta específico
 */

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Users, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOutlierStore } from '@/store/outlierStore';
import { useAppState } from '@/hooks/useAppState';
import { UserIdentityCompact } from './UserIdentity';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AthleteOption {
  id: string;
  email: string;
  name: string | null;
}

export function AthleteViewSelector() {
  const { state } = useAppState();
  const { viewingAsAthlete, setViewingAsAthlete, clearViewingAsAthlete } = useOutlierStore();
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Só mostrar para admin e superadmin
  const canView = state === 'admin' || state === 'superadmin';

  useEffect(() => {
    if (canView && open) {
      fetchAthletes();
    }
  }, [canView, open]);

  const fetchAthletes = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, email, name')
        .order('name', { ascending: true });

      if (error) throw error;

      setAthletes(
        (profiles || []).map(p => ({
          id: p.user_id,
          email: p.email,
          name: p.name,
        }))
      );
    } catch (err) {
      console.error('Error fetching athletes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAthlete = (athlete: AthleteOption) => {
    setViewingAsAthlete(athlete);
    setOpen(false);
    setSearch('');
  };

  const handleClearView = () => {
    clearViewingAsAthlete();
    setOpen(false);
  };

  if (!canView) return null;

  const filteredAthletes = athletes.filter(a => 
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex items-center gap-2">
      {viewingAsAthlete ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
          <Eye className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-500 font-medium">
            Visualizando como:
          </span>
          <UserIdentityCompact 
            user={{ name: viewingAsAthlete.name, email: viewingAsAthlete.email }} 
          />
          <button
            onClick={handleClearView}
            className="ml-1 p-1 rounded hover:bg-amber-500/30 transition-colors"
            title="Voltar à visão normal"
          >
            <X className="w-4 h-4 text-amber-500" />
          </button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
              title="Visualizar como atleta"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Visualizar como</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-medium mb-2">Selecionar atleta</p>
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAthletes.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {search ? 'Nenhum atleta encontrado' : 'Nenhum atleta cadastrado'}
                </div>
              ) : (
                <div className="py-1">
                  {filteredAthletes.map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => handleSelectAthlete(athlete)}
                      className="w-full px-3 py-2 text-left hover:bg-secondary transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <UserIdentityCompact user={{ name: athlete.name, email: athlete.email }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
