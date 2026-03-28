import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Search, MapPin, Star, Loader2, X, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CoachResult {
  coach_id: string;
  coach_name: string;
  box_name: string | null;
  city: string | null;
  composite_score: number;
  active_athletes_count?: number;
  admin_rating?: number;
}

interface ChangeCoachModalProps {
  open: boolean;
  onClose: () => void;
  currentCoachName?: string | null;
  onChanged: () => void;
}

export function ChangeCoachModal({ open, onClose, currentCoachName, onChanged }: ChangeCoachModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoachResult[]>([]);
  const [recommendations, setRecommendations] = useState<CoachResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recommendations on open
  useEffect(() => {
    if (!open) return;
    setSearchQuery('');
    setSearchResults([]);
    (async () => {
      setLoadingRecs(true);
      try {
        const { data, error } = await supabase.rpc('get_recommended_coaches', { _limit: 5 });
        if (error) throw error;
        setRecommendations((data as CoachResult[]) || []);
      } catch {
        setRecommendations([]);
      } finally {
        setLoadingRecs(false);
      }
    })();
  }, [open]);

  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_coaches_by_name', { _search: trimmed });
      if (error) throw error;
      setSearchResults((data as CoachResult[]) || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => executeSearch(value), 400);
  };

  const handleSelectCoach = async (coach: CoachResult) => {
    if (!user?.id) return;
    setLinking(coach.coach_id);

    try {
      // 1. Unlink current coach
      const { error: unlinkError } = await supabase.rpc('unlink_current_coach', { _athlete_id: user.id });
      if (unlinkError) throw unlinkError;

      // 2. Get athlete info for the request
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', user.id)
        .single();

      // 3. Insert pending link request
      const { error: insertError } = await supabase
        .from('coach_link_requests')
        .insert({
          athlete_id: user.id,
          coach_id: coach.coach_id,
          athlete_name: profileData?.name || user.email?.split('@')[0] || '',
          athlete_email: profileData?.email || user.email || '',
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast.info('Você já solicitou vínculo com este coach. Aguarde a aprovação.');
        } else {
          throw insertError;
        }
      } else {
        toast.success(`Solicitação enviada para ${coach.coach_name}! Aguarde a aprovação.`);
      }

      onChanged();
      onClose();
    } catch (err) {
      console.error('[ChangeCoach] Error:', err);
      toast.error('Erro ao trocar de coach. Tente novamente.');
    } finally {
      setLinking(null);
    }
  };

  const displayList = searchQuery.trim().length >= 2 ? searchResults : recommendations;
  const isLoading = searchQuery.trim().length >= 2 ? searching : loadingRecs;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">Trocar Coach</DialogTitle>
          {currentCoachName && (
            <p className="text-sm text-muted-foreground mt-1">
              Coach atual: <span className="font-medium text-foreground">{currentCoachName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar coach por nome..."
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-3 space-y-2 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery.trim().length >= 2
                ? 'Nenhum coach encontrado'
                : 'Nenhum coach disponível'}
            </div>
          ) : (
            <>
              {searchQuery.trim().length < 2 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Users className="w-3 h-3" /> Coaches recomendados
                </p>
              )}
              {displayList.map((coach, idx) => (
                <button
                  key={coach.coach_id}
                  onClick={() => handleSelectCoach(coach)}
                  disabled={linking !== null}
                  className="w-full text-left p-3 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/30 transition-all duration-200 disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-display text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {coach.coach_name || 'Coach'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {coach.box_name && (
                          <span className="text-xs text-muted-foreground truncate">{coach.box_name}</span>
                        )}
                        {coach.city && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {coach.city}
                          </span>
                        )}
                      </div>
                      {coach.admin_rating && coach.admin_rating > 0 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {Array.from({ length: Math.min(coach.admin_rating, 5) }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-primary fill-primary" />
                          ))}
                        </div>
                      )}
                    </div>
                    {linking === coach.coach_id && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          O novo coach precisará aprovar sua solicitação
        </p>
      </DialogContent>
    </Dialog>
  );
}
