import { useState, useEffect } from 'react';
import { Sparkles, Loader2, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import type { DiagnosticoMelhoria, Split, DiagnosticoResumo } from './types';

interface Props {
  resumo: DiagnosticoResumo;
  diagnosticos: DiagnosticoMelhoria[];
  splits: Split[];
}

export default function DeepAnalysisBlock({ resumo, diagnosticos, splits }: Props) {
  const [texto, setTexto] = useState<string | null>((resumo as any).texto_ia_completo || null);
  const [loading, setLoading] = useState(false);

  // Sync cache when resumo changes (e.g. switching between provas)
  useEffect(() => {
    setTexto((resumo as any).texto_ia_completo || null);
  }, [resumo.id]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-deep-analysis', {
        body: {
          athlete_name: resumo.nome_atleta || 'Atleta',
          finish_time: resumo.finish_time || '--:--',
          division: resumo.divisao || 'Open',
          diagnosticos: diagnosticos.map(d => ({
            movement: d.movement,
            your_score: d.your_score,
            top_1: d.top_1,
            improvement_value: d.improvement_value,
            percentage: d.percentage,
          })),
          splits: splits.map(s => ({
            split_name: s.split_name,
            time: s.time,
          })),
        },
      });

      if (error) throw error;

      const generatedText = data?.texto;
      if (!generatedText) {
        toast.error('Falha na análise. Tente novamente.');
        return;
      }

      setTexto(generatedText);

      // Save to DB to cache
      await supabase
        .from('diagnostico_resumo')
        .update({ texto_ia_completo: generatedText } as any)
        .eq('id', resumo.id);

      toast.success('Raio X gerado!');
    } catch (err) {
      console.error('[DeepAnalysis] Error:', err);
      toast.error('Erro ao gerar análise. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 rounded-2xl border border-primary/20 bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Outlier analisando sua prova...
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-[90%]" />
        <Skeleton className="h-5 w-[95%]" />
        <Skeleton className="h-4 w-[60%]" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-[85%]" />
        <Skeleton className="h-4 w-[70%]" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-[80%]" />
      </div>
    );
  }

  if (texto) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04]">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
        <div className="relative p-6 space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wide">
              Raio Tático Outlier
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase ml-auto">
              Gerado por Outlier
            </span>
          </div>
          <div className="prose prose-sm max-w-none parecer-markdown">
            <ReactMarkdown
              components={{
                h3: ({ children }) => (
                  <h3 className="text-orange-500 font-extrabold text-sm uppercase tracking-wide mt-5 mb-2 flex items-center gap-1.5">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-white/90 text-[15px] leading-relaxed mb-3">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="text-orange-400 font-bold">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-3 text-white/80 text-sm">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-3 text-white/80 text-sm">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-white/80 text-sm leading-relaxed">
                    {children}
                  </li>
                ),
              }}
            >
              {texto}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // Show generate button only when no cached result exists
  return (
    <div className="flex justify-center">
      <Button
        onClick={handleGenerate}
        className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold py-6 text-base rounded-xl shadow-lg shadow-primary/20"
      >
        <BrainCircuit className="w-5 h-5" />
        Gerar Raio Tático Outlier
      </Button>
    </div>
  );
}
