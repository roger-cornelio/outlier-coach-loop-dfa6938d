import { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RoxCoachExtractorProps {
  onSuccess: () => void;
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
 * Returns { improvement, yourScore, top1 } as time strings
 */
function parsePotentialImprovement(val: string): { improvement: string; yourScore: string; top1: string } {
  const result = { improvement: '', yourScore: '', top1: '' };
  if (!val || typeof val !== 'string') return result;

  // Try pattern: "05:28 (From 41:55 to 36:27)"
  const match = val.match(/^([\d:]+)\s*\(.*?(\d[\d:]+).*?(\d[\d:]+)\)/i);
  if (match) {
    result.improvement = match[1];
    result.yourScore = match[2];
    result.top1 = match[3];
    return result;
  }

  // Try pattern with just "From X to Y"
  const fromTo = val.match(/(\d[\d:]+).*?to\s*(\d[\d:]+)/i);
  if (fromTo) {
    result.yourScore = fromTo[1];
    result.top1 = fromTo[2];
    // Calculate improvement
    const diff = timeToSeconds(fromTo[1]) - timeToSeconds(fromTo[2]);
    if (diff > 0) {
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      result.improvement = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return result;
  }

  // Fallback: just a time value
  if (/^\d[\d:]+$/.test(val.trim())) {
    result.improvement = val.trim();
  }

  return result;
}

/** Headers/noise to filter out from splits */
const SPLIT_NOISE = ['splits', 'total', 'average', 'station', 'movement', 'time', 'split', ''];

export default function RoxCoachExtractor({ onSuccess }: RoxCoachExtractorProps) {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleExtract() {
    if (!user) {
      toast.error('Faça login para continuar.');
      return;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error('Cole a URL do seu resultado.');
      return;
    }

    setLoading(true);
    try {
      // 1. Call external API via Edge Function proxy
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke('proxy-roxcoach', {
        body: { url: trimmed },
      });
      if (proxyError) throw new Error(`Erro na API: ${proxyError.message}`);
      if (!proxyData) throw new Error('API retornou dados vazios.');

      // DEBUG: log raw API response
      console.log('Raw API Response:', JSON.stringify(proxyData, null, 2));

      // 2. Parse diagnostico_melhoria
      const rawDiag = proxyData.diagnostico_melhoria || proxyData.diagnostico || [];
      const diagRows: any[] = [];

      if (Array.isArray(rawDiag) && rawDiag.length > 0) {
        console.log('Raw diagnostico_melhoria[0]:', JSON.stringify(rawDiag[0]));

        for (const item of rawDiag) {
          // Try known key patterns
          const movement = findValue(item, 'Splits', 'Movement', 'movement', 'Station', 'split_name') || '';
          const potentialImprovement = findValue(item, 'Potential Improvement', 'potential_improvement', 'Gap', 'gap') || '';
          const focusDuringTraining = findValue(item, 'Focus During Training', 'focus_during_training', '%', 'percentage', 'Percentage') || '';

          // Parse potential improvement for your_score, top_1, improvement_value
          const parsed = typeof potentialImprovement === 'string'
            ? parsePotentialImprovement(potentialImprovement)
            : { improvement: '', yourScore: '', top1: '' };

          // Also try direct keys as fallback
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

          // Skip rows with no movement name (likely header/footer)
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
        console.log('Raw tempos_splits[0]:', JSON.stringify(rawSplits[0]));

        for (const item of rawSplits) {
          let splitName = '';
          let time = '';

          // Format A: named keys
          splitName = findValue(item, 'Split', 'split_name', 'Movement', 'Station', 'name', 'Splits') || '';
          time = String(findValue(item, 'Time', 'time', 'Tempo') || '');

          // Format B: indexed keys ("0", "1", ...)
          if (!splitName && item['0'] !== undefined) {
            splitName = String(item['0'] || '');
            time = String(item['1'] || '');
          }

          // Clean up
          splitName = splitName.trim();
          time = time.trim();

          // Filter noise
          if (!splitName || SPLIT_NOISE.includes(splitName.toLowerCase())) continue;
          if (!time) continue;

          splitRows.push({
            atleta_id: user.id,
            split_name: splitName,
            time,
          });
        }
      }

      // 4. Validate before persisting
      console.log(`Parsed: ${diagRows.length} diagnosticos, ${splitRows.length} splits`);

      if (diagRows.length === 0 && splitRows.length === 0) {
        throw new Error(
          'Não foi possível extrair dados válidos da resposta. ' +
          'Verifique se a URL está correta e tente novamente. ' +
          'Confira o console para ver a resposta bruta da API.'
        );
      }

      // 5. Delete old data only after successful parsing
      await Promise.all([
        supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
        supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
      ]);

      // 6. Insert valid rows
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

      toast.success(`Dados importados com sucesso: ${results.join(' + ')} 🔥`);
      onSuccess();
    } catch (err: any) {
      console.error('RoxCoach extract error:', err);
      toast.error(err?.message || 'Erro ao extrair dados do RoxCoach.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Diagnóstico RoxCoach
        </h2>
        <p className="text-xs text-muted-foreground">
          Cole sua URL do RoxCoach para extrair e salvar seus dados de performance.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Cole a URL do seu resultado no RoxCoach..."
          className="h-12 rounded-xl flex-1"
          disabled={loading}
        />
        <Button
          onClick={handleExtract}
          disabled={loading || !url.trim()}
          className="h-12 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Hackear Meus Dados
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
