/**
 * OnboardingProvaAlvo — Step in onboarding to collect target race info.
 * Athlete can search discovered_events or enter manually.
 */
import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Target, Search, MapPin, Calendar as CalendarIcon, ArrowRight, Loader2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { deduplicateRaceName } from '@/utils/raceNameDedup';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

interface DiscoveredEvent {
  id: string;
  nome: string;
  cidade: string | null;
  data_evento: string | null;
  categoria_hyrox: string | null;
}

const CATEGORIAS = [
  'HYROX MEN', 'HYROX WOMEN',
  'HYROX MEN PRO', 'HYROX WOMEN PRO',
  'HYROX DOUBLES MEN', 'HYROX DOUBLES WOMEN', 'HYROX DOUBLES MIXED',
];

export function OnboardingProvaAlvo({ onNext, onBack }: Props) {
  const { user } = useAuth();
  const [hasRace, setHasRace] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'search' | 'manual'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscoveredEvent[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual form
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('HYROX MEN');
  const [raceDate, setRaceDate] = useState('');
  const [cidade, setCidade] = useState('');

  const [saving, setSaving] = useState(false);

  const searchEvents = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setSearching(true);
    setSearchDone(false);

    const { data } = await supabase
      .from('discovered_events')
      .select('id, nome, cidade, data_evento, categoria_hyrox')
      .ilike('nome', `%${trimmed}%`)
      .gte('data_evento', new Date().toISOString().split('T')[0])
      .order('data_evento', { ascending: true })
      .limit(6);

    setSearchResults(data || []);
    setSearching(false);
    setSearchDone(true);
  }, []);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => searchEvents(value), 500);
    }
  }

  async function saveRace(raceName: string, cat: string, date: string, city?: string) {
    if (!user?.id) return;
    setSaving(true);

    // Remove existing ALVO
    await supabase
      .from('athlete_races')
      .delete()
      .eq('user_id', user.id)
      .eq('race_type', 'ALVO');

    const finalName = deduplicateRaceName(raceName);

    await supabase
      .from('athlete_races')
      .insert({
        user_id: user.id,
        race_type: 'ALVO',
        nome: finalName,
        categoria: cat,
        race_date: date,
        participation_type: cat.includes('DOUBLES') ? 'DUPLA' : 'INDIVIDUAL',
      });

    // Update profile with target race name for CRM quick access
    await supabase
      .from('profiles')
      .update({ onboarding_target_race: finalName })
      .eq('user_id', user.id);

    setSaving(false);
    onNext();
  }

  async function handleSelectEvent(evt: DiscoveredEvent) {
    await saveRace(
      evt.nome,
      evt.categoria_hyrox || 'HYROX MEN',
      evt.data_evento || new Date().toISOString().split('T')[0],
      evt.cidade || undefined,
    );
  }

  async function handleManualSubmit() {
    if (!nome.trim() || !raceDate) return;
    await saveRace(nome.trim(), categoria, raceDate, cidade || undefined);
  }

  // Initial question
  if (hasRace === null) {
    return (
      <motion.div key="provaAlvo-ask" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
        className="text-center z-10 max-w-xl w-full">

        <motion.div className="mb-6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <Target className="w-8 h-8 text-primary" />
          </div>
        </motion.div>

        <motion.h1 className="font-display text-2xl md:text-4xl tracking-widest text-foreground mb-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          PROVA ALVO
        </motion.h1>

        <motion.p className="text-muted-foreground text-sm md:text-base mb-10"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          Você já tem uma prova HYROX como objetivo?
        </motion.p>

        <div className="flex flex-col gap-3 max-w-sm mx-auto mb-8">
          <motion.button
            onClick={() => setHasRace(true)}
            className="w-full p-5 rounded-xl border border-border/50 bg-secondary/50 hover:border-primary/50 hover:bg-secondary/80 transition-all text-left flex items-center gap-4 group"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <div className="p-2.5 rounded-lg bg-primary/20">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-sm tracking-wide text-foreground">SIM, JÁ TENHO</p>
              <p className="text-xs text-muted-foreground">Quero cadastrar minha prova alvo</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-auto" />
          </motion.button>

          <motion.button
            onClick={() => { setHasRace(false); onNext(); }}
            className="w-full p-5 rounded-xl border border-border/50 bg-secondary/50 hover:border-border hover:bg-secondary/80 transition-all text-left flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
            <div className="p-2.5 rounded-lg bg-secondary">
              <CalendarIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display text-sm tracking-wide text-foreground">AINDA NÃO</p>
              <p className="text-xs text-muted-foreground">Vou decidir depois</p>
            </div>
          </motion.button>
        </div>

        <motion.button onClick={onBack}
          className="text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
          ← Voltar
        </motion.button>
      </motion.div>
    );
  }

  // Search + Manual form
  return (
    <motion.div key="provaAlvo-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="text-center z-10 max-w-xl w-full">

      <motion.h1 className="font-display text-xl md:text-3xl tracking-widest text-foreground mb-2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        CADASTRAR PROVA ALVO
      </motion.h1>

      {/* Toggle search/manual */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => setMode('search')}
          className={`px-4 py-2 rounded-lg text-xs font-display tracking-wider transition-all ${
            mode === 'search' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/50 text-muted-foreground border border-border/50'
          }`}>
          BUSCAR EVENTO
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-lg text-xs font-display tracking-wider transition-all ${
            mode === 'manual' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/50 text-muted-foreground border border-border/50'
          }`}>
          CADASTRAR MANUAL
        </button>
      </div>

      {mode === 'search' && (
        <div className="max-w-md mx-auto">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Ex: HYROX São Paulo, HYROX Rio..."
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>

          {searching && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Buscando eventos...</span>
            </div>
          )}

          {!searching && searchDone && searchResults.length > 0 && (
            <div className="space-y-2 mb-6">
              {searchResults.map(evt => (
                <button key={evt.id}
                  onClick={() => handleSelectEvent(evt)}
                  disabled={saving}
                  className="w-full p-4 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/50 hover:bg-secondary/80 transition-all text-left group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-sm tracking-wide text-foreground">{evt.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {evt.cidade && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />{evt.cidade}
                          </span>
                        )}
                        {evt.data_evento && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(evt.data_evento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching && searchDone && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum evento encontrado. <button onClick={() => setMode('manual')} className="text-primary underline">Cadastrar manualmente</button>
            </p>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="max-w-md mx-auto space-y-4 text-left">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome da prova *</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: HYROX São Paulo 2026" className="bg-secondary/50 border-border/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Categoria *</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm">
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data *</label>
              <Input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cidade</label>
              <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: São Paulo" className="bg-secondary/50 border-border/50" />
            </div>
          </div>

          <motion.button
            onClick={handleManualSubmit}
            disabled={!nome.trim() || !raceDate || saving}
            className={`w-full font-display text-sm tracking-widest px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 ${
              nome.trim() && raceDate && !saving
                ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/30'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            whileHover={nome.trim() && raceDate && !saving ? { scale: 1.02 } : {}}
            whileTap={nome.trim() && raceDate && !saving ? { scale: 0.98 } : {}}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {saving ? 'SALVANDO...' : 'CONFIRMAR PROVA ALVO'}
          </motion.button>
        </div>
      )}

      {saving && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Salvando prova alvo...</span>
        </div>
      )}

      <div className="flex justify-center gap-4 mt-6">
        <motion.button onClick={() => setHasRace(null)}
          className="text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          ← Voltar
        </motion.button>
        <motion.button onClick={onNext}
          className="text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          Pular →
        </motion.button>
      </div>
    </motion.div>
  );
}
