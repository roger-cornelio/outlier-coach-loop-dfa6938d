/**
 * WELCOME SCREEN - Funil de venda no onboarding
 * 
 * Step 1: Busca automática da prova HYROX
 * Step 2: "PARABÉNS POR ESSE RESULTADO" 
 * Step 3: "MAS PARA SER OUTLIER..." (pontos fracos)
 * Step 4: "PRONTO PARA SER FORA DA CURVA?" (CTA)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { useCoachStylePersistence } from '@/hooks/useCoachStylePersistence';
import { parseDiagnosticResponse, hasDiagnosticData } from '@/utils/diagnosticParser';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { LogOut, User, Loader2, ArrowRight, Search, Trophy, AlertTriangle, Zap, ChevronRight, Target, Dumbbell, Timer, Flame, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { secondsToTime } from '@/components/diagnostico/types';
import { OnboardingCoachSelection } from '@/components/OnboardingCoachSelection';

type OnboardingStep = 'search' | 'congrats' | 'bottlenecks' | 'cta' | 'profile' | 'profileGoal' | 'profileCta' | 'coach';

interface ProfileAnswers {
  experience: 'never' | 'spectator' | '1race' | '2plus' | null;
  goal: 'finish' | 'improve_time' | 'podium' | 'lifestyle' | null;
  targetRace: 'next3months' | 'next6months' | 'nodate' | 'just_training' | null;
}

interface SearchResult {
  athlete_name: string;
  event_name: string;
  division: string;
  time_formatted: string;
  result_url: string;
  season_id: number;
  event_index?: number;
}

interface DiagnosticSummary {
  finish_time: string | null;
  evento: string | null;
  divisao: string | null;
  posicao_categoria: string | null;
  posicao_geral: string | null;
  nome_atleta: string | null;
}

interface Bottleneck {
  movement: string;
  improvement_value: number;
  percentage: number;
}

function extractIdpFromUrl(url: string): { idp: string | null; event: string | null } {
  try {
    const urlObj = new URL(url);
    return { idp: urlObj.searchParams.get('idp'), event: urlObj.searchParams.get('event') || null };
  } catch {
    const idpMatch = url.match(/idp=([^&]+)/);
    const eventMatch = url.match(/event=([^&]+)/);
    return { idp: idpMatch ? idpMatch[1] : null, event: eventMatch ? eventMatch[1] : null };
  }
}

export function WelcomeScreen() {
  const { setCurrentView } = useOutlierStore();
  const { user, profile, signOut } = useAuth();
  const { athleteConfig } = useOutlierStore();
  const { saveCoachStyle } = useCoachStylePersistence();

  const [step, setStep] = useState<OnboardingStep>('search');
  const [isSaving, setIsSaving] = useState(false);
  const [coachAutoLinked, setCoachAutoLinked] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<SearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef('');
  const autoSearchedRef = useRef(false);

  // Diagnostic data
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);

  // Profile questionnaire state
  const [profileAnswers, setProfileAnswers] = useState<ProfileAnswers>({
    experience: null,
    goal: null,
    targetRace: null,
  });

  const displayName = profile?.name || profile?.email?.split('@')[0] || 'Atleta';
  const freeDiagConsumedRef = useRef(false);
  const coachAutoLinkRef = useRef(false);

  // Auto-link coach from free diagnostic (localStorage)
  // Only links if athlete has NO coach yet — never overwrites existing coach
  useEffect(() => {
    if (!user?.id || coachAutoLinkRef.current) return;
    coachAutoLinkRef.current = true;

    try {
      const raw = localStorage.getItem('outlier_selected_coach');
      if (!raw) return;

      const { coachId, coachName } = JSON.parse(raw);
      localStorage.removeItem('outlier_selected_coach');

      if (!coachId) return;

      // REGRA: Só vincula se o atleta NÃO tem coach
      if (profile?.coach_id) {
        console.log('[WELCOME] Athlete already has coach, ignoring localStorage coach selection');
        return;
      }

      console.log('[WELCOME] Auto-linking coach from free diagnostic:', coachId, coachName);

      // Link asynchronously, then skip coach step
      (async () => {
        try {
          // Insert into coach_athletes
          const { error: linkError } = await supabase
            .from('coach_athletes')
            .insert({ coach_id: coachId, athlete_id: user.id });

          if (linkError && !linkError.message.includes('duplicate')) {
            console.error('[WELCOME] Coach link error:', linkError);
            return;
          }

          // Update profiles.coach_id (legacy field)
          const { data: coachProfileRes } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', coachId)
            .single();

          if (coachProfileRes?.id) {
            await supabase
              .from('profiles')
              .update({ coach_id: coachProfileRes.id })
              .eq('user_id', user.id);
          }

          console.log('[WELCOME] Coach auto-linked successfully');
          toast.success(`Vinculado ao coach ${coachName || ''}!`);
        } catch (err) {
          console.error('[WELCOME] Error auto-linking coach:', err);
        }
      })();

      // Mark as auto-linked so CTA buttons skip coach step
      setCoachAutoLinked(true);
    } catch (e) {
      console.warn('[WELCOME] Error reading coach from localStorage:', e);
    }
  }, [user?.id, profile?.coach_id]);

  // Check for free diagnostic data from localStorage (pre-signup)
  useEffect(() => {
    if (!user || freeDiagConsumedRef.current) return;
    
    try {
      const raw = localStorage.getItem('outlier_free_diagnostic');
      if (!raw) return;
      
      const data = JSON.parse(raw);
      // Expire after 24h
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('outlier_free_diagnostic');
        return;
      }

      freeDiagConsumedRef.current = true;
      console.log('[WELCOME] Found free diagnostic in localStorage, persisting...');

      // Persist to DB in background, skip to congrats immediately
      const selectedResult = data.selectedResult as SearchResult;
      const scrapeData = data.scrapedData;

      setSummary({
        finish_time: scrapeData?.formatted_time || selectedResult?.time_formatted || null,
        evento: selectedResult?.event_name || scrapeData?.event_name || null,
        divisao: selectedResult?.division || scrapeData?.race_category || null,
        posicao_categoria: null,
        posicao_geral: null,
        nome_atleta: selectedResult?.athlete_name || null,
      });
      setBottlenecks([]);
      setStep('congrats');

      // Persist asynchronously
      (async () => {
        try {
          const sourceUrl = selectedResult?.result_url || '';

          // 1. Call proxy-roxcoach for full diagnostic
          let parsed: ReturnType<typeof parseDiagnosticResponse> | null = null;
          try {
            const proxyResult = await supabase.functions.invoke('proxy-roxcoach', {
              body: {
                athlete_name: selectedResult?.athlete_name,
                event_name: selectedResult?.event_name,
                division: selectedResult?.division,
                season_id: selectedResult?.season_id,
                result_url: selectedResult?.result_url,
              },
            });
            if (!proxyResult.error && proxyResult.data?.ok !== false) {
              parsed = parseDiagnosticResponse(proxyResult.data, user.id, sourceUrl);
              if (!hasDiagnosticData(parsed)) parsed = null;
            }
          } catch (e) {
            console.warn('[WELCOME] proxy-roxcoach failed for free diag, continuing with basic data:', e);
          }

          // 2. Save diagnostico_resumo + melhoria + splits
          if (!parsed) {
            await supabase.from('diagnostico_resumo').insert({
              atleta_id: user.id,
              source_url: sourceUrl,
              evento: selectedResult?.event_name,
              temporada: String(selectedResult?.season_id || ''),
              divisao: selectedResult?.division,
              finish_time: scrapeData?.formatted_time || selectedResult?.time_formatted,
              nome_atleta: selectedResult?.athlete_name,
            });
          } else {
            parsed.resumoRow.evento = selectedResult?.event_name;
            parsed.resumoRow.temporada = String(selectedResult?.season_id || '');
            parsed.resumoRow.divisao = selectedResult?.division;
            parsed.resumoRow.finish_time = scrapeData?.formatted_time || selectedResult?.time_formatted;
            parsed.resumoRow.nome_atleta = selectedResult?.athlete_name;

            const { data: insertedResumo } = await supabase
              .from('diagnostico_resumo')
              .insert(parsed.resumoRow)
              .select('id')
              .single();

            if (insertedResumo?.id) {
              if (parsed.diagRows.length > 0) {
                await supabase.from('diagnostico_melhoria').insert(
                  parsed.diagRows.map(r => ({ ...r, resumo_id: insertedResumo.id }))
                );
              }
              if (parsed.splitRows.length > 0) {
                await supabase.from('tempos_splits').insert(
                  parsed.splitRows.map(r => ({ ...r, resumo_id: insertedResumo.id }))
                );
              }

              // Update bottlenecks for UI
              const sorted = [...parsed.diagRows]
                .filter(d => d.improvement_value > 0)
                .sort((a, b) => b.improvement_value - a.improvement_value)
                .slice(0, 3);
              setBottlenecks(sorted.map(d => ({
                movement: d.movement,
                improvement_value: d.improvement_value,
                percentage: d.percentage,
              })));
            }
          }

          // 3. Save race_results
          const { idp } = extractIdpFromUrl(sourceUrl);
          if (idp) {
            const { data: existing } = await supabase
              .from('race_results')
              .select('id')
              .eq('athlete_id', user.id)
              .eq('hyrox_idp', idp)
              .maybeSingle();
            if (!existing) {
              await supabase.from('race_results').insert({
                athlete_id: user.id,
                hyrox_idp: idp,
                source_url: sourceUrl,
                hyrox_event: selectedResult?.event_name,
              });
            }
          }

          // 4. Clear localStorage after successful persist
          localStorage.removeItem('outlier_free_diagnostic');
          console.log('[WELCOME] Free diagnostic persisted and localStorage cleared');
        } catch (e) {
          console.error('[WELCOME] Error persisting free diagnostic:', e);
          // Don't block onboarding flow on persistence failure
        }
      })();
    } catch (e) {
      console.warn('[WELCOME] Error reading free diagnostic from localStorage:', e);
    }
  }, [user]);

  // Auto-search on mount (only if no free diag was consumed)
  useEffect(() => {
    if (profile?.name && user && !autoSearchedRef.current && !freeDiagConsumedRef.current) {
      autoSearchedRef.current = true;
      setSearchQuery(profile.name);
      executeSearch(profile.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.name, user]);

  const executeSearch = useCallback(async (query: string, isRetry = false) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (!isRetry && trimmed === lastSearchedRef.current) return;
    lastSearchedRef.current = trimmed;

    const parts = trimmed.split(/\s+/);
    let firstName = '', lastName = '';
    if (parts.length === 1) { lastName = parts[0]; }
    else { firstName = parts[0]; lastName = parts.slice(1).join(' '); }

    setSearching(true);
    setSearchDone(false);
    setSearchError(false);

    const MAX_RETRIES = 2;
    let lastErr: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));

        const gender = athleteConfig?.sexo === 'feminino' ? 'W' : athleteConfig?.sexo === 'masculino' ? 'M' : '';
        const { data, error } = await supabase.functions.invoke('search-hyrox-athlete', {
          body: { firstName, lastName, gender },
        });
        if (error) throw error;

        const rawResults: SearchResult[] = data?.results || [];
        const sorted = rawResults.sort((a, b) => {
          if (b.season_id !== a.season_id) return b.season_id - a.season_id;
          return (a.event_index ?? 999) - (b.event_index ?? 999);
        });
        const displayed = sorted.slice(0, 3);

        if (user) {
          const urls = displayed.map(r => r.result_url);
          const { data: existing } = await supabase
            .from('diagnostico_resumo')
            .select('source_url')
            .eq('atleta_id', user.id)
            .in('source_url', urls);
          const importedUrls = new Set((existing || []).map(e => e.source_url));
          setSearchResults(displayed.filter(r => !importedUrls.has(r.result_url)));
        } else {
          setSearchResults(displayed);
        }

        setSearching(false);
        setSearchDone(true);
        return;
      } catch (err) {
        lastErr = err;
        console.error(`Search attempt ${attempt + 1} failed:`, err);
      }
    }

    // All retries exhausted
    console.error('Search failed after retries:', lastErr);
    setSearchError(true);
    setSearching(false);
    setSearchDone(true);
  }, [user, athleteConfig?.sexo]);

  function handleQueryChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => executeSearch(value), 800);
    }
  }

  async function handleSelectResult(result: SearchResult, retryCount = 0) {
    if (!user) return;
    setGenerating(true);
    setImportError(null);
    setRetryResult(null);

    const MAX_RETRIES = 2;

    try {
      // Save race history
      const { idp } = extractIdpFromUrl(result.result_url);
      if (idp) {
        const { data: existing } = await supabase
          .from('race_results')
          .select('id')
          .eq('athlete_id', user.id)
          .eq('hyrox_idp', idp)
          .maybeSingle();
        if (!existing) {
          await supabase.from('race_results').insert({
            athlete_id: user.id,
            hyrox_idp: idp,
            source_url: result.result_url,
            hyrox_event: result.event_name,
          });
        }
      }

      // Generate diagnostic with retry
      const sourceUrl = result.result_url;
      let proxyData: any = null;
      let proxyAttempts = 0;

      while (proxyAttempts <= MAX_RETRIES) {
        try {
          if (proxyAttempts > 0) await new Promise(r => setTimeout(r, 1000 * proxyAttempts));
          const proxyResult = await supabase.functions.invoke('proxy-roxcoach', {
            body: {
              athlete_name: result.athlete_name,
              event_name: result.event_name,
              division: result.division,
              season_id: result.season_id,
              result_url: result.result_url,
            },
          });
          if (!proxyResult.error && proxyResult.data?.ok !== false) {
            proxyData = proxyResult.data;
            break;
          }
        } catch {
          console.warn(`proxy-roxcoach attempt ${proxyAttempts + 1} failed`);
        }
        proxyAttempts++;
      }

      let parsed: ReturnType<typeof parseDiagnosticResponse> | null = null;
      if (proxyData) {
        try {
          parsed = parseDiagnosticResponse(proxyData, user.id, sourceUrl);
          if (!hasDiagnosticData(parsed)) parsed = null;
        } catch { parsed = null; }
      }

      // Save to DB
      if (!parsed) {
        await supabase.from('diagnostico_resumo').insert({
          atleta_id: user.id,
          source_url: sourceUrl,
          evento: result.event_name,
          temporada: String(result.season_id),
          divisao: result.division,
          finish_time: result.time_formatted,
          nome_atleta: result.athlete_name,
        });

        setSummary({
          finish_time: result.time_formatted,
          evento: result.event_name,
          divisao: result.division,
          posicao_categoria: null,
          posicao_geral: null,
          nome_atleta: result.athlete_name,
        });
        setBottlenecks([]);
      } else {
        parsed.resumoRow.evento = result.event_name;
        parsed.resumoRow.temporada = String(result.season_id);
        parsed.resumoRow.divisao = result.division;
        parsed.resumoRow.finish_time = result.time_formatted;
        parsed.resumoRow.nome_atleta = result.athlete_name;

        const { data: insertedResumo, error: resumoError } = await supabase
          .from('diagnostico_resumo')
          .insert(parsed.resumoRow)
          .select('id, finish_time, evento, divisao, posicao_categoria, posicao_geral, nome_atleta')
          .single();

        if (resumoError) throw resumoError;

        const resumoId = insertedResumo.id;

        if (parsed.diagRows.length > 0) {
          const rowsWithId = parsed.diagRows.map(r => ({ ...r, resumo_id: resumoId }));
          await supabase.from('diagnostico_melhoria').insert(rowsWithId);
        }
        if (parsed.splitRows.length > 0) {
          const rowsWithId = parsed.splitRows.map(r => ({ ...r, resumo_id: resumoId }));
          await supabase.from('tempos_splits').insert(rowsWithId);
        }

        setSummary({
          finish_time: insertedResumo.finish_time,
          evento: insertedResumo.evento,
          divisao: insertedResumo.divisao,
          posicao_categoria: insertedResumo.posicao_categoria,
          posicao_geral: insertedResumo.posicao_geral,
          nome_atleta: insertedResumo.nome_atleta,
        });

        const sorted = [...parsed.diagRows]
          .filter(d => d.improvement_value > 0)
          .sort((a, b) => b.improvement_value - a.improvement_value)
          .slice(0, 3);
        setBottlenecks(sorted.map(d => ({
          movement: d.movement,
          improvement_value: d.improvement_value,
          percentage: d.percentage,
        })));
      }

      setStep('congrats');
    } catch (err: any) {
      console.error('Import error:', err);
      setImportError('Não conseguimos importar sua prova. A conexão com o servidor pode estar instável.');
      setRetryResult(result);
    } finally {
      setGenerating(false);
    }
  }

  async function handleFinish() {
    setIsSaving(true);
    const result = await saveCoachStyle('PULSE');
    if (result.success) {
      setCurrentView('dashboard');
    } else {
      toast.error('Erro ao iniciar. Tente novamente.');
    }
    setIsSaving(false);
  }

  async function handleSkip() {
    setStep('profile');
  }

  const experienceOptions = [
    { key: 'never' as const, icon: Target, label: 'Nunca fiz HYROX', desc: 'Quero começar do zero' },
    { key: 'spectator' as const, icon: Search, label: 'Já assisti provas', desc: 'Conheço mas nunca competi' },
    { key: '1race' as const, icon: Trophy, label: 'Fiz 1 prova', desc: 'Mas não tenho resultado online' },
    { key: '2plus' as const, icon: Flame, label: '2+ provas', desc: 'Resultado não aparece na busca' },
  ];

  const goalOptions = [
    { key: 'finish' as const, icon: Target, label: 'COMPLETAR', desc: 'Cruzar a linha de chegada' },
    { key: 'improve_time' as const, icon: Timer, label: 'MELHORAR TEMPO', desc: 'Superar meu resultado anterior' },
    { key: 'podium' as const, icon: Trophy, label: 'PÓDIO', desc: 'Competir entre os melhores' },
    { key: 'lifestyle' as const, icon: Dumbbell, label: 'LIFESTYLE', desc: 'Treinar no formato HYROX' },
  ];

  const targetRaceOptions = [
    { key: 'next3months' as const, label: 'NOS PRÓXIMOS 3 MESES', desc: 'Prova confirmada em breve' },
    { key: 'next6months' as const, label: 'NOS PRÓXIMOS 6 MESES', desc: 'Planejando para o semestre' },
    { key: 'nodate' as const, label: 'SEM DATA DEFINIDA', desc: 'Quero me preparar com calma' },
    { key: 'just_training' as const, label: 'SÓ QUERO TREINAR', desc: 'Sem compromisso com prova' },
  ];

  function getMotivationalMessage(): string {
    if (profileAnswers.goal === 'podium') return 'Seu objetivo é ambicioso. Vamos construir o caminho até o pódio.';
    if (profileAnswers.goal === 'improve_time') return 'Cada segundo conta. Vamos otimizar sua performance.';
    if (profileAnswers.goal === 'finish') return 'A primeira conquista é cruzar a linha. Vamos te preparar.';
    return 'Treinar como um HYROX athlete vai transformar seu condicionamento.';
  }

  const handleLogout = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'var(--gradient-glow)' }} />

      {/* Top bar */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        <motion.div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 text-sm text-foreground"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-3 h-3 text-primary" />
          </div>
          <span className="hidden sm:inline max-w-[150px] truncate">{displayName}</span>
        </motion.div>
        <motion.button onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all text-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} title="Sair">
          <LogOut className="w-4 h-4" />
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {step === 'search' && (
          <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="text-center z-10 max-w-xl w-full">
            
            <motion.div className="mb-8" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}>
              <OutlierWordmark size="hero" />
            </motion.div>

            <motion.h1 className="font-display text-2xl md:text-4xl tracking-widest text-foreground mb-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              ENTENDEMOS A SUA PROVA
            </motion.h1>

            <motion.p className="text-muted-foreground mb-8 text-sm md:text-base"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              Buscando seus resultados HYROX para gerar seu diagnóstico personalizado.
            </motion.p>

            {/* Search input */}
            <motion.div className="mb-6 max-w-md mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Buscar pelo seu nome..."
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>
            </motion.div>

            {/* Loading */}
            {(searching || generating) && !importError && (
              <motion.div className="flex flex-col items-center gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {generating ? 'Analisando sua performance...' : 'Buscando resultados...'}
                </p>
              </motion.div>
            )}

            {/* Import error with retry */}
            {importError && !generating && (
              <motion.div className="mb-6 max-w-md mx-auto p-4 rounded-xl bg-destructive/10 border border-destructive/30"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm text-foreground font-medium mb-1">Falha na importação</p>
                    <p className="text-xs text-muted-foreground mb-3">{importError}</p>
                    <div className="flex gap-2">
                      {retryResult && (
                        <button
                          onClick={() => handleSelectResult(retryResult)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Tentar novamente
                        </button>
                      )}
                      <button
                        onClick={() => { setImportError(null); setRetryResult(null); }}
                        className="px-3 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground text-xs hover:text-foreground transition-colors"
                      >
                        Escolher outra prova
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Search error */}
            {!searching && !generating && searchDone && searchError && (
              <motion.div className="mb-6 max-w-md mx-auto p-4 rounded-xl bg-destructive/10 border border-destructive/30"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm text-foreground font-medium mb-1">Erro na busca</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Não foi possível conectar ao servidor de resultados HYROX. Tente novamente em alguns segundos.
                    </p>
                    <button
                      onClick={() => { lastSearchedRef.current = ''; executeSearch(searchQuery, true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Tentar novamente
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {!searching && !generating && !importError && searchDone && !searchError && searchResults.length > 0 && (
              <motion.div className="space-y-3 mb-6 max-w-md mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-sm text-muted-foreground mb-2">Selecione sua prova:</p>
                {searchResults.map((result, i) => (
                  <motion.button key={result.result_url}
                    onClick={() => handleSelectResult(result)}
                    className="w-full p-4 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/50 hover:bg-secondary/80 transition-all text-left group"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display text-sm tracking-wide text-foreground">{result.event_name}</p>
                        <p className="text-xs text-muted-foreground">{result.division} · {result.time_formatted}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* No results */}
            {!searching && !generating && !importError && searchDone && !searchError && searchResults.length === 0 && (
              <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-sm text-muted-foreground mb-4">
                  Nenhuma prova encontrada. Você pode buscar com outro nome ou pular esta etapa.
                </p>
              </motion.div>
            )}

            {/* Skip */}
            {!generating && (
              <motion.button onClick={handleSkip}
                className="text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                Ainda não tenho prova HYROX → Pular
              </motion.button>
            )}
          </motion.div>
        )}

        {step === 'congrats' && summary && (
          <motion.div key="congrats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="text-center z-10 max-w-xl w-full">

            <motion.div className="mb-6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
            </motion.div>

            <motion.h1 className="font-display text-3xl md:text-5xl tracking-widest text-foreground mb-2"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              PARABÉNS
            </motion.h1>

            <motion.p className="font-display text-lg md:text-xl tracking-wide text-primary mb-8"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              POR ESSE RESULTADO
            </motion.p>

            {/* Race card */}
            <motion.div className="card-elevated p-6 md:p-8 max-w-md mx-auto mb-8 border border-primary/20"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              
              {summary.finish_time && (
                <p className="font-display text-4xl md:text-5xl tracking-wider text-primary mb-4">
                  {summary.finish_time}
                </p>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                {summary.evento && <p>{summary.evento}</p>}
                {summary.divisao && <p className="uppercase tracking-wide">{summary.divisao}</p>}
                {summary.posicao_categoria && (
                  <p className="text-foreground font-medium">
                    #{summary.posicao_categoria} na categoria
                  </p>
                )}
              </div>
            </motion.div>

            <motion.button
              onClick={() => setStep(bottlenecks.length > 0 ? 'bottlenecks' : 'cta')}
              className="font-display text-lg tracking-widest px-12 py-4 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-lg shadow-primary/30 flex items-center gap-3 mx-auto"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              <ArrowRight className="w-5 h-5" />
              CONTINUAR
            </motion.button>

            <motion.button onClick={() => setStep('search')}
              className="mt-4 text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
              ← Voltar
            </motion.button>
          </motion.div>
        )}

        {step === 'bottlenecks' && (
          <motion.div key="bottlenecks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="text-center z-10 max-w-xl w-full">

            <motion.p className="font-display text-lg tracking-wide text-muted-foreground mb-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              MAS PARA SER
            </motion.p>

            <motion.div className="mb-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}>
              <OutlierWordmark size="lg" />
            </motion.div>

            <motion.h2 className="font-display text-xl md:text-2xl tracking-widest text-foreground mb-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              VOCÊ PRECISA MELHORAR
            </motion.h2>

            {/* Bottleneck cards */}
            <div className="space-y-4 mb-10 max-w-md mx-auto">
              {bottlenecks.map((b, i) => {
                const improvementSec = Math.round(b.improvement_value);
                return (
                  <motion.div key={b.movement}
                    className="p-5 rounded-xl bg-destructive/10 border border-destructive/30 text-left"
                    initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.2 }}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-destructive/20 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="font-display text-base tracking-wide text-foreground uppercase">
                          {b.movement}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Potencial de melhoria: <span className="text-destructive font-bold">
                            {improvementSec > 0 ? secondsToTime(improvementSec) : `${Math.round(b.percentage)}%`}
                          </span>
                        </p>
                        {/* Visual bar */}
                        <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-destructive to-destructive/60"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(b.percentage, 100)}%` }}
                            transition={{ delay: 1 + i * 0.2, duration: 0.8 }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {bottlenecks.length === 0 && (
                <motion.p className="text-muted-foreground text-sm"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                  Diagnóstico detalhado indisponível para esta prova, mas seus dados foram salvos.
                </motion.p>
              )}
            </div>

            <motion.button
              onClick={() => setStep('cta')}
              className="font-display text-lg tracking-widest px-12 py-4 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-lg shadow-primary/30 flex items-center gap-3 mx-auto"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
              <ArrowRight className="w-5 h-5" />
              CONTINUAR
            </motion.button>

            <motion.button onClick={() => setStep('congrats')}
              className="mt-4 text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
              ← Voltar
            </motion.button>
          </motion.div>
        )}

        {step === 'cta' && (
          <motion.div key="cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="text-center z-10 max-w-xl w-full">

            <motion.div className="mb-6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Zap className="w-10 h-10 text-primary" />
              </div>
            </motion.div>

            <motion.h1 className="font-display text-2xl md:text-4xl tracking-widest text-foreground mb-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              PRONTO PARA SER
            </motion.h1>

            <motion.div className="mb-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6 }}>
              <p className="font-display text-3xl md:text-5xl tracking-widest text-primary">
                FORA DA CURVA?
              </p>
            </motion.div>

            <motion.p className="text-muted-foreground text-sm md:text-base mb-12 max-w-sm mx-auto"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              Seu diagnóstico revelou onde melhorar. Um coach dedicado vai montar treinos específicos para seus pontos fracos.
            </motion.p>

            <motion.button
              onClick={() => coachAutoLinked ? handleFinish() : setStep('coach')}
              disabled={isSaving}
              className={`
                font-display text-xl tracking-widest px-16 py-6 rounded-xl
                transition-all duration-300 flex items-center justify-center gap-3 mx-auto
                ${!isSaving
                  ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-xl shadow-primary/40 ring-2 ring-primary/40'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                }
              `}
              whileHover={!isSaving ? { scale: 1.05 } : {}}
              whileTap={!isSaving ? { scale: 0.95 } : {}}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {isSaving ? 'CARREGANDO...' : 'QUERO MEU PLANO DE TREINO'}
            </motion.button>

            <motion.button onClick={() => setStep(bottlenecks.length > 0 ? 'bottlenecks' : 'congrats')}
              className="mt-4 text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              ← Voltar
            </motion.button>
          </motion.div>
        )}

        {/* ===== PROFILE QUESTIONNAIRE: Step 1 - Experience ===== */}
        {step === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="text-center z-10 max-w-xl w-full">

            <motion.div className="mb-6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Dumbbell className="w-8 h-8 text-primary" />
              </div>
            </motion.div>

            <motion.h1 className="font-display text-2xl md:text-4xl tracking-widest text-foreground mb-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              CONTE-NOS SOBRE VOCÊ
            </motion.h1>

            <motion.p className="text-muted-foreground text-sm md:text-base mb-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              Qual sua experiência com HYROX?
            </motion.p>

            <div className="space-y-3 max-w-md mx-auto mb-8">
              {experienceOptions.map((opt, i) => {
                const Icon = opt.icon;
                const selected = profileAnswers.experience === opt.key;
                return (
                  <motion.button key={opt.key}
                    onClick={() => {
                      setProfileAnswers(prev => ({ ...prev, experience: opt.key }));
                      setTimeout(() => setStep('profileGoal'), 400);
                    }}
                    className={`w-full p-4 rounded-xl border transition-all text-left group flex items-center gap-4 ${
                      selected
                        ? 'bg-primary/20 border-primary/50 ring-2 ring-primary/30'
                        : 'bg-secondary/50 border-border/50 hover:border-primary/30 hover:bg-secondary/80'
                    }`}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}>
                    <div className={`p-2 rounded-lg ${selected ? 'bg-primary/30' : 'bg-secondary'}`}>
                      <Icon className={`w-5 h-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-display text-sm tracking-wide text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <motion.button onClick={() => setStep('search')}
              className="text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              ← Voltar
            </motion.button>
          </motion.div>
        )}

        {/* ===== PROFILE QUESTIONNAIRE: Step 2 - Goal ===== */}
        {step === 'profileGoal' && (
          <motion.div key="profileGoal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="text-center z-10 max-w-xl w-full">

            <motion.h1 className="font-display text-2xl md:text-4xl tracking-widest text-foreground mb-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              QUAL SEU OBJETIVO?
            </motion.h1>

            <motion.p className="text-muted-foreground text-sm md:text-base mb-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              Isso define como vamos montar seu plano de evolução.
            </motion.p>

            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-8">
              {goalOptions.map((opt, i) => {
                const Icon = opt.icon;
                const selected = profileAnswers.goal === opt.key;
                return (
                  <motion.button key={opt.key}
                    onClick={() => {
                      setProfileAnswers(prev => ({ ...prev, goal: opt.key }));
                      setTimeout(() => setStep('profileCta'), 400);
                    }}
                    className={`p-5 rounded-xl border transition-all text-center group flex flex-col items-center gap-3 ${
                      selected
                        ? 'bg-primary/20 border-primary/50 ring-2 ring-primary/30'
                        : 'bg-secondary/50 border-border/50 hover:border-primary/30 hover:bg-secondary/80'
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}>
                    <div className={`p-3 rounded-full ${selected ? 'bg-primary/30' : 'bg-secondary'}`}>
                      <Icon className={`w-6 h-6 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-display text-xs md:text-sm tracking-wide text-foreground">{opt.label}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <motion.button onClick={() => setStep('profile')}
              className="text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              ← Voltar
            </motion.button>
          </motion.div>
        )}

        {/* ===== PROFILE CTA: Motivational close ===== */}
        {step === 'profileCta' && (
          <motion.div key="profileCta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="text-center z-10 max-w-xl w-full">

            <motion.div className="mb-6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Flame className="w-10 h-10 text-primary" />
              </div>
            </motion.div>

            <motion.h1 className="font-display text-2xl md:text-4xl tracking-widest text-foreground mb-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              TODO OUTLIER COMEÇA
            </motion.h1>

            <motion.div className="mb-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6 }}>
              <p className="font-display text-3xl md:text-5xl tracking-widest text-primary">
                PELO PRIMEIRO PASSO
              </p>
            </motion.div>

            <motion.p className="text-muted-foreground text-sm md:text-base mb-6 max-w-sm mx-auto"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              {getMotivationalMessage()}
            </motion.p>

            {/* Summary cards */}
            <motion.div className="flex flex-wrap justify-center gap-3 mb-10 max-w-md mx-auto"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              {profileAnswers.experience && (
                <div className="px-4 py-2 rounded-full bg-secondary/80 border border-border/50 text-xs text-muted-foreground">
                  {experienceOptions.find(o => o.key === profileAnswers.experience)?.label}
                </div>
              )}
              {profileAnswers.goal && (
                <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-xs text-primary font-display tracking-wide">
                  {goalOptions.find(o => o.key === profileAnswers.goal)?.label}
                </div>
              )}
            </motion.div>

            <motion.button
              onClick={() => setStep('coach')}
              disabled={isSaving}
              className={`
                font-display text-xl tracking-widest px-16 py-6 rounded-xl
                transition-all duration-300 flex items-center justify-center gap-3 mx-auto
                ${!isSaving
                  ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-xl shadow-primary/40 ring-2 ring-primary/40'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                }
              `}
              whileHover={!isSaving ? { scale: 1.05 } : {}}
              whileTap={!isSaving ? { scale: 0.95 } : {}}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {isSaving ? 'CARREGANDO...' : 'QUERO MEU PLANO DE TREINO'}
            </motion.button>

            <motion.button onClick={() => setStep('profileGoal')}
              className="mt-4 text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
              ← Voltar
            </motion.button>
          </motion.div>
        )}

        {/* ===== COACH SELECTION STEP ===== */}
        {step === 'coach' && (
          <OnboardingCoachSelection
            onCoachSelected={(_coachId, _coachName) => {
              handleFinish();
            }}
            onBack={() => {
              // Go back to whichever CTA was before
              if (summary) {
                setStep('cta');
              } else {
                setStep('profileCta');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
