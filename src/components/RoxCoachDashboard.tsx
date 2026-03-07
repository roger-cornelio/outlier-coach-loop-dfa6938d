import { useEffect, useState } from 'react';
import { Zap, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { DiagnosticoData, DiagnosticoResumo, Split, DiagnosticoMelhoria } from './diagnostico/types';
import PerformanceHighlights from './diagnostico/PerformanceHighlights';
import DiagnosticCharts from './diagnostico/DiagnosticCharts';
import SplitTimesGrid from './diagnostico/SplitTimesGrid';
import ImprovementTable from './diagnostico/ImprovementTable';
import ParecerPremium from './diagnostico/ParecerPremium';
import RoxCoachExtractor from './RoxCoachExtractor';

interface RoxCoachDashboardProps {
  refreshKey?: number;
}

export default function RoxCoachDashboard({ refreshKey = 0 }: RoxCoachDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DiagnosticoData>({ resumo: null, splits: [], diagnosticos: [] });
  const [loading, setLoading] = useState(true);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [showImporter, setShowImporter] = useState(false);

  // Fetch diagnostic data from DB
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function fetchData() {
      setLoading(true);
      try {
        const [resumoRes, splitsRes, diagRes] = await Promise.all([
          supabase.from('diagnostico_resumo').select('*').eq('atleta_id', user!.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('tempos_splits').select('*').eq('atleta_id', user!.id),
          supabase.from('diagnostico_melhoria').select('*').eq('atleta_id', user!.id),
        ]);

        setData({
          resumo: (resumoRes.data as DiagnosticoResumo | null),
          splits: (splitsRes.data as Split[]) || [],
          diagnosticos: (diagRes.data as DiagnosticoMelhoria[]) || [],
        });
      } catch (err) {
        console.error('Error fetching diagnostic data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, refreshKey, localRefresh]);

  async function handleDeleteDiagnostic() {
    if (!user) return;
    setDeleting(true);
    try {
      await Promise.all([
        supabase.from('diagnostico_resumo').delete().eq('atleta_id', user.id),
        supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
        supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
      ]);
      setData({ resumo: null, splits: [], diagnosticos: [] });
      toast.success('Diagnóstico apagado com sucesso.');
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
      {/* Dynamic title */}
      {data.resumo?.nome_atleta && (
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Diagnóstico OUTLIER: {data.resumo.nome_atleta}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {data.resumo.evento && (
              <Badge variant="outline" className="text-xs font-medium">
                {data.resumo.evento}
              </Badge>
            )}
            {(data.resumo.divisao || data.resumo.temporada) && (
              <Badge variant="secondary" className="text-xs font-medium">
                {[data.resumo.divisao, data.resumo.temporada].filter(Boolean).join(' · ')}
              </Badge>
            )}
          </div>
        </div>
      )}

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
          {data.resumo && <PerformanceHighlights resumo={data.resumo} />}
          {data.resumo && <ParecerPremium resumo={data.resumo} diagnosticos={data.diagnosticos} onToggleFullAnalysis={() => setShowFullAnalysis(v => !v)} showFullAnalysis={showFullAnalysis} />}

          {showFullAnalysis && (
            <>
              <DiagnosticCharts splits={data.splits} diagnosticos={data.diagnosticos} />
              <SplitTimesGrid splits={data.splits} />
              <ImprovementTable diagnosticos={data.diagnosticos} splits={data.splits} />
            </>
          )}

          {/* Import new + Delete actions */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
              onClick={() => setShowImporter(v => !v)}
            >
              <Zap className="w-4 h-4" />
              {showImporter ? 'Fechar importador' : 'Importar novo diagnóstico'}
            </Button>

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
                    Todos os dados do diagnóstico atual serão apagados permanentemente. Você poderá gerar um novo importando uma prova.
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

          {/* Inline importer when toggled */}
          {showImporter && (
            <RoxCoachExtractor onSuccess={() => { setLocalRefresh(v => v + 1); setShowImporter(false); }} />
          )}
        </>
      )}

      {/* Empty state — show extractor inline */}
      {!loading && !hasData && (
        <RoxCoachExtractor onSuccess={() => setLocalRefresh(v => v + 1)} />
      )}
    </div>
  );
}
