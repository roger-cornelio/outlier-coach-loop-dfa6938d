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
      // 1. Call external API via Edge Function proxy (avoids CORS)
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke('proxy-roxcoach', {
        body: { url: trimmed },
      });
      if (proxyError) throw new Error(`Erro na API: ${proxyError.message}`);
      const data = proxyData;

      if (!data) throw new Error('API retornou dados vazios.');

      // DEBUG: log raw API response to inspect exact keys
      console.log('Raw API Response:', JSON.stringify(data, null, 2));

      // 2. Delete old data for re-import
      await Promise.all([
        supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
        supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
      ]);

      // Helper: parse numeric value from potentially formatted strings
      const toNum = (val: any): number => {
        if (val == null || val === '') return 0;
        const cleaned = String(val).replace(/[^0-9.\-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      // 3. Bulk insert diagnostico_melhoria with flexible key mapping
      const rawDiag = data.diagnostico_melhoria || data.diagnostico || [];
      if (Array.isArray(rawDiag) && rawDiag.length > 0) {
        console.log('Raw diagnostico_melhoria[0] keys:', Object.keys(rawDiag[0]));
        const diagRows = rawDiag.map((item: any) => ({
          atleta_id: user.id,
          movement: item['Movement'] || item['movement'] || '',
          metric: item['Metric'] || item['metric'] || '',
          value: toNum(item['Value'] || item['value']),
          your_score: toNum(item['You'] || item['you'] || item['Your Score'] || item['your_score']),
          top_1: toNum(item['Top 1%'] || item['top_1'] || item['Top1'] || item['top1']),
          improvement_value: toNum(item['Gap'] || item['gap'] || item['Improvement'] || item['improvement_value']),
          percentage: toNum(item['%'] || item['percentage'] || item['Percentage'] || item['pct']),
          total_improvement: toNum(item['Total'] || item['total_improvement'] || item['Total Improvement']),
        }));
        const { error: diagError } = await supabase.from('diagnostico_melhoria').insert(diagRows);
        if (diagError) throw new Error(`Erro ao salvar diagnóstico: ${diagError.message}`);
      }

      // 4. Bulk insert tempos_splits with flexible key mapping
      const rawSplits = data.tempos_splits || data.splits || [];
      if (Array.isArray(rawSplits) && rawSplits.length > 0) {
        console.log('Raw tempos_splits[0] keys:', Object.keys(rawSplits[0]));
        const splitRows = rawSplits.map((item: any) => ({
          atleta_id: user.id,
          split_name: item['Split'] || item['split_name'] || item['Movement'] || item['Station'] || item['name'] || '',
          time: String(item['Time'] || item['time'] || ''),
        }));
        const { error: splitError } = await supabase.from('tempos_splits').insert(splitRows);
        if (splitError) throw new Error(`Erro ao salvar splits: ${splitError.message}`);
      }

      toast.success('Dados hackeados e salvos com sucesso! 🔥');
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
