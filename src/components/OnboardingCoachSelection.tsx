/**
 * ONBOARDING COACH SELECTION
 * 
 * Passo do onboarding onde o atleta seleciona seu coach.
 * Dois caminhos:
 * 1. "Já tenho coach" → busca por nome na lista de coaches aprovados
 * 2. "Não tenho coach" → recomendações rankeadas por score
 * 
 * Se o coach buscado não está na Outlier, mostra mensagem + sugere coaches.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Search, Users, UserPlus, Star, MapPin, Loader2, ArrowRight, ChevronLeft, Trophy, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CoachResult {
  coach_id: string;
  coach_name: string;
  box_name: string | null;
  city: string | null;
  composite_score: number;
  active_athletes_count?: number;
  admin_rating?: number;
}

interface OnboardingCoachSelectionProps {
  onCoachSelected: (coachId: string, coachName: string) => void;
  onBack?: () => void;
  skipLinking?: boolean;
}

type View = 'choice' | 'search' | 'recommendations';

export function OnboardingCoachSelection({ onCoachSelected, onBack, skipLinking = false }: OnboardingCoachSelectionProps) {
  const { user } = useAuth();
  const [view, setView] = useState<View>('choice');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoachResult[]>([]);
  const [recommendations, setRecommendations] = useState<CoachResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search coaches by name
  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setSearchDone(false);
      return;
    }

    setSearching(true);
    setSearchDone(false);

    try {
      const { data, error } = await supabase.rpc('search_coaches_by_name', { _search: trimmed });
      if (error) throw error;
      setSearchResults((data as CoachResult[]) || []);
    } catch (err) {
      console.error('[CoachSelection] Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => executeSearch(value), 400);
  }, [executeSearch]);

  // Load recommendations
  const loadRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const { data, error } = await supabase.rpc('get_recommended_coaches', { _limit: 5 });
      if (error) throw error;
      setRecommendations((data as CoachResult[]) || []);
    } catch (err) {
      console.error('[CoachSelection] Recommendations error:', err);
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'recommendations') {
      loadRecommendations();
    }
  }, [view, loadRecommendations]);

  // Link athlete to coach
  const handleSelectCoach = async (coach: CoachResult) => {
    if (skipLinking) {
      onCoachSelected(coach.coach_id, coach.coach_name || '');
      return;
    }
    if (!user?.id) return;
    setLinking(coach.coach_id);

    try {
      // Insert into coach_athletes
      const { error: linkError } = await supabase
        .from('coach_athletes')
        .insert({ coach_id: coach.coach_id, athlete_id: user.id });

      if (linkError) {
        // May already be linked
        if (linkError.code === '23505') {
          toast.info('Você já está vinculado a este coach!');
        } else {
          throw linkError;
        }
      }

      // Update profiles.coach_id (legacy field)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        const coachProfileRes = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', coach.coach_id)
          .single();

        if (coachProfileRes.data) {
          await supabase
            .from('profiles')
            .update({ coach_id: coachProfileRes.data.id })
            .eq('user_id', user.id);
        }
      }

      toast.success(`Vinculado ao coach ${coach.coach_name}!`);
      onCoachSelected(coach.coach_id, coach.coach_name || '');
    } catch (err) {
      console.error('[CoachSelection] Link error:', err);
      toast.error('Erro ao vincular coach. Tente novamente.');
    } finally {
      setLinking(null);
    }
  };

  const CoachCard = ({ coach, rank }: { coach: CoachResult; rank?: number }) => (
    <motion.button
      onClick={() => handleSelectCoach(coach)}
      disabled={linking !== null}
      className="w-full text-left p-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/30 transition-all duration-200 group"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-4">
        {rank && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display ${
            rank === 1 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {rank}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-display text-base tracking-wide text-foreground truncate">
            {coach.coach_name || 'Coach'}
          </p>
          <div className="flex items-center gap-3 mt-1">
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
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: Math.min(coach.admin_rating, 5) }).map((_, i) => (
                <Star key={i} className="w-3 h-3 text-primary fill-primary" />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {linking === coach.coach_id ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
      </div>
    </motion.button>
  );

  return (
    <motion.div
      key="coach-selection"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center z-10 max-w-xl w-full"
    >
      <AnimatePresence mode="wait">
        {/* ===== CHOICE: "Já tenho coach" vs "Quero um coach" ===== */}
        {view === 'choice' && (
          <motion.div key="choice" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <motion.div className="mb-6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Users className="w-10 h-10 text-primary" />
              </div>
            </motion.div>

            <motion.h1 className="font-display text-2xl md:text-4xl tracking-widest text-foreground mb-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              CONECTE-SE AO SEU COACH
            </motion.h1>

            <motion.p className="text-muted-foreground text-sm md:text-base mb-10 max-w-sm mx-auto"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              Todo atleta Outlier treina com um coach dedicado. Vamos encontrar o seu.
            </motion.p>

            <motion.div className="flex flex-col gap-4 max-w-sm mx-auto"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <button
                onClick={() => setView('search')}
                className="flex items-center gap-4 w-full p-5 rounded-xl border-2 border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg tracking-wide text-foreground">JÁ TENHO COACH</p>
                  <p className="text-sm text-muted-foreground">Buscar meu coach na Outlier</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>

              <button
                onClick={() => setView('recommendations')}
                className="flex items-center gap-4 w-full p-5 rounded-xl border-2 border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg tracking-wide text-foreground">QUERO UM COACH</p>
                  <p className="text-sm text-muted-foreground">Ver coaches recomendados</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </motion.div>

            {onBack && (
              <motion.button onClick={onBack}
                className="mt-6 text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                ← Voltar
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ===== SEARCH: Buscar coach por nome ===== */}
        {view === 'search' && (
          <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <motion.h1 className="font-display text-2xl md:text-3xl tracking-widest text-foreground mb-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              BUSCAR MEU COACH
            </motion.h1>

            <motion.p className="text-muted-foreground text-sm mb-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              Digite o nome do seu coach ou da box/assessoria
            </motion.p>

            <motion.div className="mb-6 max-w-md mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Nome do coach ou box..."
                  className="pl-10 bg-secondary/50 border-border/50"
                  autoFocus
                />
              </div>
            </motion.div>

            {/* Search results */}
            <div className="max-w-md mx-auto space-y-3 mb-6">
              {searching && (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Buscando...</span>
                </div>
              )}

              {!searching && searchDone && searchResults.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <p className="font-display text-lg text-foreground mb-1">COACH NÃO ENCONTRADO</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Seu coach ainda não está na Outlier. Veja nossos coaches recomendados:
                  </p>
                  <button
                    onClick={() => setView('recommendations')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-display tracking-wide hover:opacity-90 transition-opacity"
                  >
                    <Trophy className="w-4 h-4" />
                    VER COACHES RECOMENDADOS
                  </button>
                </motion.div>
              )}

              {!searching && searchResults.map((coach) => (
                <CoachCard key={coach.coach_id} coach={coach} />
              ))}
            </div>

            <button onClick={() => { setView('choice'); setSearchQuery(''); setSearchResults([]); setSearchDone(false); }}
              className="text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors flex items-center gap-1 mx-auto">
              <ChevronLeft className="w-3 h-3" /> Voltar
            </button>
          </motion.div>
        )}

        {/* ===== RECOMMENDATIONS: Coaches rankeados ===== */}
        {view === 'recommendations' && (
          <motion.div key="recommendations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <motion.div className="mb-6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
            </motion.div>

            <motion.h1 className="font-display text-2xl md:text-3xl tracking-widest text-foreground mb-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              COACHES RECOMENDADOS
            </motion.h1>

            <motion.p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              Rankeados por avaliação, retenção de atletas e resultados na plataforma.
            </motion.p>

            <div className="max-w-md mx-auto space-y-3 mb-6">
              {loadingRecs && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Carregando recomendações...</span>
                </div>
              )}

              {!loadingRecs && recommendations.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">Nenhum coach disponível no momento.</p>
                  <p className="text-xs mt-1">Entre em contato com nosso suporte.</p>
                </div>
              )}

              {!loadingRecs && recommendations.map((coach, idx) => (
                <motion.div key={coach.coach_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}>
                  <CoachCard coach={coach} rank={idx + 1} />
                </motion.div>
              ))}
            </div>

            <button onClick={() => setView('choice')}
              className="text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors flex items-center gap-1 mx-auto">
              <ChevronLeft className="w-3 h-3" /> Voltar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
