import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Zap, Search, Trophy, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { motion, AnimatePresence } from 'framer-motion';

interface RoxCoachExtractorProps {
  onSuccess: () => void;
}

interface SearchResult {
  athlete_name: string;
  event_name: string;
  division: string;
  time_formatted: string;
  result_url: string;
  season_id: number;
}

/** Convert "mm:ss" or "hh:mm:ss" string to total seconds */
function timeToSeconds(t: string): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/** Parse a numeric value from potentially formatted strings like "87.5%" */
function toNum(val: any): number {
  if (val == null || val === '') return 0;
  const cleaned = String(val).replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Find value from an object using multiple possible keys (case-insensitive) */
function findValue(obj: any, ...aliases: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const alias of aliases) {
    const lower = alias.toLowerCase();
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === lower) return obj[key];
    }
  }
  return undefined;
}

/**
 * Parse "Potential Improvement" field like "05:28 (From 41:55 to 36:27)"
 */
function parsePotentialImprovement(val: string): { improvement: string; yourScore: string; top1: string } {
  const result = { improvement: '', yourScore: '', top1: '' };
  if (!val || typeof val !== 'string') return result;

  const match = val.match(/^([\d:]+)\s*\(.*?(\d[\d:]+).*?(\d[\d:]+)\)/i);
  if (match) {
    result.improvement = match[1];
    result.yourScore = match[2];
    result.top1 = match[3];
    return result;
  }

  const fromTo = val.match(/(\d[\d:]+).*?to\s*(\d[\d:]+)/i);
  if (fromTo) {
    result.yourScore = fromTo[1];
    result.top1 = fromTo[2];
    const diff = timeToSeconds(fromTo[1]) - timeToSeconds(fromTo[2]);
    if (diff > 0) {
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      result.improvement = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return result;
  }

  if (/^\d[\d:]+$/.test(val.trim())) {
    result.improvement = val.trim();
  }

  return result;
}

const SPLIT_NOISE = ['splits', 'total', 'average', 'station', 'movement', 'time', 'split', ''];

export default function RoxCoachExtractor({ onSuccess }: RoxCoachExtractorProps) {
  const { user, profile } = useAuth();
  const { athleteConfig } = useOutlierStore();

  // Search state
  const profileName = profile?.name || '';
  const [searchQuery, setSearchQuery] = useState(profileName);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef('');

  // Diagnostic generation state
  const [generating, setGenerating] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState('');

  // Auto-search on mount
  useEffect(() => {
    if (!profileName || !user) return;
    executeSearch(profileName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (trimmed === lastSearchedRef.current) return;
    lastSearchedRef.current = trimmed;

    const parts = trimmed.split(/\s+/);
    let firstName = '';
    let lastName = '';
    if (parts.length === 1) {
      lastName = parts[0];
    } else {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    setSearching(true);
    setSearchDone(false);

    try {
      const gender = athleteConfig?.sexo === 'feminino' ? 'W' : athleteConfig?.sexo === 'masculino' ? 'M' : '';
      const { data, error } = await supabase.functions.invoke('search-hyrox-athlete', {
        body: { firstName, lastName, gender },
      });
      if (error) throw error;
      setSearchResults(data?.results || []);
    } catch (err: any) {
      console.error('Search error:', err);
      toast.error('Erro ao buscar resultados.');
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, [athleteConfig?.sexo]);

  function handleQueryChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => executeSearch(value), 800);
    }
  }

  async function handleGenerateDiagnostic(result: SearchResult) {
    if (!user) {
      toast.error('Faça login para continuar.');
      return;
    }

    setSelectedUrl(result.result_url);
    setGenerating(true);

    try {
      // 1. Call proxy to get diagnostic data
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke('proxy-roxcoach', {
        body: { url: result.result_url },
      });
      if (proxyError) throw new Error(`Erro na API: ${proxyError.message}`);
      if (!proxyData) throw new Error('API retornou dados vazios.');

      console.log('Raw API Response:', JSON.stringify(proxyData, null, 2));

      // 2. Parse diagnostico_melhoria
      const rawDiag = proxyData.diagnostico_melhoria || proxyData.diagnostico || [];
      const diagRows: any[] = [];

      if (Array.isArray(rawDiag) && rawDiag.length > 0) {
        for (const item of rawDiag) {
          const movement = findValue(item, 'Splits', 'Movement', 'movement', 'Station', 'split_name') || '';
          const potentialImprovement = findValue(item, 'Potential Improvement', 'potential_improvement', 'Gap', 'gap') || '';
          const focusDuringTraining = findValue(item, 'Focus During Training', 'focus_during_training', '%', 'percentage', 'Percentage') || '';

          const parsed = typeof potentialImprovement === 'string'
            ? parsePotentialImprovement(potentialImprovement)
            : { improvement: '', yourScore: '', top1: '' };

          const yourScore = parsed.yourScore
            ? timeToSeconds(parsed.yourScore)
            : toNum(findValue(item, 'You', 'you', 'Your Score', 'your_score'));
          const top1 = parsed.top1
            ? timeToSeconds(parsed.top1)
            : toNum(findValue(item, 'Top 1%', 'top_1', 'Top1'));
          const improvementValue = parsed.improvement
            ? timeToSeconds(parsed.improvement)
            : toNum(findValue(item, 'Gap', 'gap', 'Improvement', 'improvement_value'));
          const percentage = toNum(focusDuringTraining);

          if (!movement || SPLIT_NOISE.includes(movement.toLowerCase().trim())) continue;

          diagRows.push({
            atleta_id: user.id,
            movement,
            metric: typeof potentialImprovement === 'string' && potentialImprovement ? 'Potential Improvement' : findValue(item, 'Metric', 'metric') || 'time',
            value: toNum(findValue(item, 'Value', 'value')),
            your_score: yourScore,
            top_1: top1,
            improvement_value: improvementValue,
            percentage,
            total_improvement: toNum(findValue(item, 'Total', 'total_improvement', 'Total Improvement')),
          });
        }
      }

      // 3. Parse tempos_splits
      const rawSplits = proxyData.tempos_splits || proxyData.splits || [];
      const splitRows: any[] = [];

      if (Array.isArray(rawSplits) && rawSplits.length > 0) {
        for (const item of rawSplits) {
          let splitName = '';
          let time = '';

          splitName = findValue(item, 'Split', 'split_name', 'Movement', 'Station', 'name', 'Splits') || '';
          time = String(findValue(item, 'Time', 'time', 'Tempo') || '');

          if (!splitName && item['0'] !== undefined) {
            splitName = String(item['0'] || '');
            time = String(item['1'] || '');
          }

          splitName = splitName.trim();
          time = time.trim();

          if (!splitName || SPLIT_NOISE.includes(splitName.toLowerCase())) continue;
          if (!time) continue;

          splitRows.push({
            atleta_id: user.id,
            split_name: splitName,
            time,
          });
        }
      }

      // 4. Validate
      console.log(`Parsed: ${diagRows.length} diagnosticos, ${splitRows.length} splits`);

      if (diagRows.length === 0 && splitRows.length === 0) {
        throw new Error(
          'Não foi possível extrair dados válidos dessa prova. ' +
          'Verifique se o resultado possui dados detalhados de estações.'
        );
      }

      // 5. Delete old + insert new
      await Promise.all([
        supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
        supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
      ]);

      const results: string[] = [];

      if (diagRows.length > 0) {
        const { error: diagError } = await supabase.from('diagnostico_melhoria').insert(diagRows);
        if (diagError) throw new Error(`Erro ao salvar diagnóstico: ${diagError.message}`);
        results.push(`${diagRows.length} diagnósticos`);
      }

      if (splitRows.length > 0) {
        const { error: splitError } = await supabase.from('tempos_splits').insert(splitRows);
        if (splitError) throw new Error(`Erro ao salvar splits: ${splitError.message}`);
        results.push(`${splitRows.length} splits`);
      }

      toast.success(`Diagnóstico gerado: ${results.join(' + ')} 🔥`);
      onSuccess();
    } catch (err: any) {
      console.error('Diagnostic generation error:', err);
      toast.error(err?.message || 'Erro ao gerar diagnóstico.');
    } finally {
      setGenerating(false);
      setSelectedUrl('');
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Diagnóstico de Performance
        </h2>
        <p className="text-xs text-muted-foreground">
          Busque seu nome para encontrar suas provas e gerar o diagnóstico automaticamente.
        </p>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Digite seu nome completo..."
            className="h-12 rounded-xl pl-10"
            disabled={generating}
          />
        </div>
        <Button
          onClick={() => executeSearch(searchQuery)}
          disabled={searching || searchQuery.trim().length < 2 || generating}
          className="h-12 rounded-xl px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
        >
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Loading */}
      {searching && (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Buscando suas provas...</span>
        </div>
      )}

      {/* Results list */}
      <AnimatePresence>
        {!searching && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground font-medium">
              {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''} — selecione a prova para diagnosticar:
            </p>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {searchResults.map((result, idx) => {
                const isSelected = selectedUrl === result.result_url;
                return (
                  <motion.button
                    key={`${result.result_url}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleGenerateDiagnostic(result)}
                    disabled={generating}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30'
                    } ${generating && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.event_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.athlete_name} • {result.division}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {result.time_formatted && (
                        <span className="text-sm font-bold text-primary">
                          {result.time_formatted}
                        </span>
                      )}
                      {isSelected && generating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!searching && searchDone && searchResults.length === 0 && (
        <div className="py-6 text-center space-y-2">
          <Search className="w-8 h-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Nenhum resultado encontrado. Tente outro nome ou verifique a grafia.
          </p>
        </div>
      )}
    </div>
  );
}
