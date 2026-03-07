import { useEffect, useState, useCallback } from 'react';
import { Zap, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { DiagnosticoData, DiagnosticoResumo, Split, DiagnosticoMelhoria } from './diagnostico/types';
import PerformanceHighlights from './diagnostico/PerformanceHighlights';
import AIAnalysis from './diagnostico/AIAnalysis';
import DiagnosticCharts from './diagnostico/DiagnosticCharts';
import SplitTimesGrid from './diagnostico/SplitTimesGrid';
import ImprovementTable from './diagnostico/ImprovementTable';

interface RoxCoachDashboardProps {
  refreshKey?: number;
}

// Noise words to filter from split/diagnostic names
const SPLIT_NOISE = ['splits', 'total', 'average', 'station', 'movement', 'time', 'split', ''];

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

/** Convert "mm:ss" or "hh:mm:ss" string to total seconds */
function timeToSec(t: string): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function parsePotentialImprovement(val: string) {
  const result = { improvement: '', yourScore: '', top1: '' };
  if (!val || typeof val !== 'string') return result;
  const match = val.match(/^([\d:]+)\s*\(.*?(\d[\d:]+).*?(\d[\d:]+)\)/i);
  if (match) {
    result.improvement = match[1]; result.yourScore = match[2]; result.top1 = match[3];
    return result;
  }
  const fromTo = val.match(/(\d[\d:]+).*?to\s*(\d[\d:]+)/i);
  if (fromTo) {
    result.yourScore = fromTo[1]; result.top1 = fromTo[2];
    const diff = timeToSec(fromTo[1]) - timeToSec(fromTo[2]);
    if (diff > 0) {
      const mins = Math.floor(diff / 60); const secs = diff % 60;
      result.improvement = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return result;
  }
  if (/^\d[\d:]+$/.test(val.trim())) result.improvement = val.trim();
  return result;
}

export default function RoxCoachDashboard({ refreshKey = 0 }: RoxCoachDashboardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<DiagnosticoData>({ resumo: null, splits: [], diagnosticos: [] });
  const [loading, setLoading] = useState(true);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [url, setUrl] = useState('');
  const [hacking, setHacking] = useState(false);

  // Fetch existing data from DB
  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      setLoading(true);
      const [resumoRes, splitsRes, diagRes] = await Promise.all([
        supabase.from('diagnostico_resumo').select('*').eq('atleta_id', user!.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('tempos_splits').select('*').eq('atleta_id', user!.id).order('created_at'),
        supabase.from('diagnostico_melhoria').select('*').eq('atleta_id', user!.id).order('percentage', { ascending: false }),
      ]);
      setData({
        resumo: (resumoRes.data as any[])?.[0] || null,
        splits: (splitsRes.data as any[]) || [],
        diagnosticos: (diagRes.data as any[]) || [],
      });
      setLoading(false);
    }
    fetchData();
  }, [user, refreshKey, localRefresh]);

  const handleHack = useCallback(async () => {
    if (!user || !url.trim()) return;
    setHacking(true);
    try {
      // Call edge function which proxies external API
      const { data: apiData, error: fnError } = await supabase.functions.invoke('proxy-roxcoach', {
        body: { url: url.trim() },
      });
      if (fnError) throw new Error(fnError.message);
      if (!apiData) throw new Error('API retornou dados vazios.');

      console.log('API Response keys:', Object.keys(apiData));

      // 1. Parse resumo_performance
      const rawResumo = apiData.resumo_performance || apiData.resumo || {};
      const resumoRow = {
        atleta_id: user.id,
        posicao_categoria: findValue(rawResumo, 'posicao_categoria', 'Posição Categoria', 'rank_categoria', 'Rank Categoria') || null,
        posicao_geral: findValue(rawResumo, 'posicao_geral', 'Posição Geral', 'rank_geral', 'Rank Geral') || null,
        run_total: findValue(rawResumo, 'run_total', 'Run Total', 'running_total') || null,
        workout_total: findValue(rawResumo, 'workout_total', 'Workout Total', 'station_total') || null,
        texto_ia: apiData.texto_ia || apiData.texto || null,
        source_url: url.trim(),
      };

      // 2. Parse tempos_splits
      const rawSplits = apiData.tempos_splits || apiData.splits || [];
      const splitRows: any[] = [];
      if (Array.isArray(rawSplits)) {
        for (const item of rawSplits) {
          let splitName = findValue(item, 'Split', 'split_name', 'Movement', 'Station', 'name', 'Splits') || '';
          let time = String(findValue(item, 'Time', 'time', 'Tempo') || '');
          if (!splitName && item['0'] !== undefined) {
            splitName = String(item['0'] || ''); time = String(item['1'] || '');
          }
          splitName = splitName.trim(); time = time.trim();
          if (!splitName || SPLIT_NOISE.includes(splitName.toLowerCase())) continue;
          if (!time) continue;
          splitRows.push({ atleta_id: user.id, split_name: splitName, time });
        }
      }

      // 3. Parse diagnostico_melhoria
      const rawDiag = apiData.diagnostico_melhoria || apiData.diagnostico || [];
      const diagRows: any[] = [];
      if (Array.isArray(rawDiag)) {
        for (const item of rawDiag) {
          const movement = findValue(item, 'Splits', 'Movement', 'movement', 'Station', 'split_name') || '';
          const potentialImprovement = findValue(item, 'Potential Improvement', 'potential_improvement', 'Gap', 'gap') || '';
          const focusDuringTraining = findValue(item, 'Focus During Training', 'focus_during_training', '%', 'percentage', 'Percentage') || '';
          const parsed = typeof potentialImprovement === 'string' ? parsePotentialImprovement(potentialImprovement) : { improvement: '', yourScore: '', top1: '' };
          const yourScore = parsed.yourScore ? timeToSec(parsed.yourScore) : toNum(findValue(item, 'You', 'you', 'Your Score', 'your_score'));
          const top1 = parsed.top1 ? timeToSec(parsed.top1) : toNum(findValue(item, 'Top 1%', 'top_1', 'Top1'));
          const improvementValue = parsed.improvement ? timeToSec(parsed.improvement) : toNum(findValue(item, 'Gap', 'gap', 'Improvement', 'improvement_value'));
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

      // 4. Validate
      console.log(`Parsed: resumo=${!!resumoRow.texto_ia}, ${splitRows.length} splits, ${diagRows.length} diag`);
      if (diagRows.length === 0 && splitRows.length === 0 && !resumoRow.texto_ia) {
        throw new Error('Não foi possível extrair dados válidos dessa prova.');
      }

      // 5. Delete old + insert new (all 3 tables)
      await Promise.all([
        supabase.from('diagnostico_resumo').delete().eq('atleta_id', user.id),
        supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
        supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
      ]);

      const results: string[] = [];

      // Insert resumo
      const { error: resumoErr } = await supabase.from('diagnostico_resumo').insert(resumoRow);
      if (resumoErr) console.error('Resumo insert error:', resumoErr.message);
      else results.push('resumo');

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
      setLocalRefresh(k => k + 1);
    } catch (err: any) {
      console.error('Diagnostic generation error:', err);
      toast.error(err?.message || 'Erro ao gerar diagnóstico.');
    } finally {
      setHacking(false);
    }
  }, [user, url]);

  async function handleDeleteDiagnostic() {
    if (!user) return;
    setDeleting(true);
    try {
      await Promise.all([
        supabase.from('diagnostico_resumo').delete().eq('atleta_id', user.id),
        supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
        supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
      ]);
      toast.success('Diagnóstico apagado com sucesso.');
      setLocalRefresh(k => k + 1);
    } catch (err) {
      console.error('Error deleting diagnostic:', err);
      toast.error('Erro ao apagar diagnóstico.');
    } finally {
      setDeleting(false);
    }
  }

  const hasData = data.resumo || data.splits.length > 0 || data.diagnosticos.length > 0;

  return (
    <div className="space-y-6">
      {/* Input area */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Diagnóstico de Performance
          </h2>
          <p className="text-xs text-muted-foreground">
            Cole a URL do seu resultado HYROX e clique para gerar o diagnóstico completo.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cole aqui a URL do resultado HYROX..."
            className="h-12 rounded-xl flex-1"
            disabled={hacking}
          />
          <Button
            onClick={handleHack}
            disabled={hacking || !url.trim()}
            className="h-12 rounded-xl px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
          >
            {hacking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {hacking ? 'Hackeando...' : 'Hackear Meus Dados'}
          </Button>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-40 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </div>
      )}

      {/* Data sections */}
      {!loading && hasData && (
        <>
          {/* Section 1: Performance Highlights */}
          {data.resumo && <PerformanceHighlights resumo={data.resumo} />}

          {/* Section 2: AI Analysis */}
          {data.resumo?.texto_ia && <AIAnalysis textoIa={data.resumo.texto_ia} />}

          {/* Section 3: Charts */}
          <DiagnosticCharts splits={data.splits} diagnosticos={data.diagnosticos} />

          {/* Section 4: Split Times Grid */}
          <SplitTimesGrid splits={data.splits} />

          {/* Section 5: Improvement Table */}
          <ImprovementTable diagnosticos={data.diagnosticos} />

          {/* Delete button */}
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2">
                  <Trash2 className="w-4 h-4" />
                  Apagar diagnóstico
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar diagnóstico?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os dados do diagnóstico atual serão apagados permanentemente. Você poderá gerar um novo a qualquer momento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteDiagnostic} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? 'Apagando...' : 'Sim, apagar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !hasData && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
          <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Cole a URL do seu resultado e clique em "Hackear Meus Dados" para gerar seu diagnóstico completo.
          </p>
        </div>
      )}
    </div>
  );
}
