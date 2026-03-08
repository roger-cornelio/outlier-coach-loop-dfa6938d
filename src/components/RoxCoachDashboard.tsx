import { useEffect, useState } from 'react';
import { Zap, Trash2, Loader2, MapPin, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { DiagnosticoResumo, Split, DiagnosticoMelhoria } from './diagnostico/types';
import PerformanceHighlights from './diagnostico/PerformanceHighlights';

import SplitTimesGrid from './diagnostico/SplitTimesGrid';
import ImprovementTable from './diagnostico/ImprovementTable';
import ParecerPremium from './diagnostico/ParecerPremium';
import EvolutionProjectionCard from './diagnostico/EvolutionProjectionCard';
import RoxCoachExtractor from './RoxCoachExtractor';
import { parseDiagnosticResponse, hasDiagnosticData } from '@/utils/diagnosticParser';
import { motion } from 'framer-motion';

interface RoxCoachDashboardProps {
  refreshKey?: number;
}

export default function RoxCoachDashboard({ refreshKey = 0 }: RoxCoachDashboardProps) {
  const { user } = useAuth();
  const [allResumos, setAllResumos] = useState<DiagnosticoResumo[]>([]);
  const [selectedResumoId, setSelectedResumoId] = useState<string | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoMelhoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [showImporter, setShowImporter] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Fetch all resumos
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function fetchResumos() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('diagnostico_resumo')
          .select('*')
          .eq('atleta_id', user!.id);

        const raw = (data as DiagnosticoResumo[]) || [];
        // Sort: year from evento desc, then temporada (season) desc, then created_at desc
        const resumos = raw.sort((a, b) => {
          const yearA = parseInt(a.evento?.match(/^(\d{4})/)?.[1] || '0', 10);
          const yearB = parseInt(b.evento?.match(/^(\d{4})/)?.[1] || '0', 10);
          if (yearB !== yearA) return yearB - yearA;
          const seasonA = parseInt(a.temporada?.replace(/\D/g, '') || '0', 10) || 0;
          const seasonB = parseInt(b.temporada?.replace(/\D/g, '') || '0', 10) || 0;
          if (seasonB !== seasonA) return seasonB - seasonA;
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        });
        setAllResumos(resumos);

        // Auto-select most recent
        if (resumos.length > 0 && !selectedResumoId) {
          setSelectedResumoId(resumos[0].id);
        } else if (resumos.length > 0 && selectedResumoId && !resumos.find(r => r.id === selectedResumoId)) {
          setSelectedResumoId(resumos[0].id);
        }
      } catch (err) {
        console.error('Error fetching resumos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchResumos();
  }, [user, refreshKey, localRefresh]);

  // Fetch detail data when selectedResumoId changes
  useEffect(() => {
    if (!user || !selectedResumoId) {
      setSplits([]);
      setDiagnosticos([]);
      return;
    }

    async function fetchDetail() {
      setLoadingDetail(true);
      try {
        const [splitsRes, diagRes] = await Promise.all([
          supabase.from('tempos_splits').select('*').eq('resumo_id', selectedResumoId),
          supabase.from('diagnostico_melhoria').select('*').eq('resumo_id', selectedResumoId),
        ]);

        let splitsData = (splitsRes.data as Split[]) || [];
        let diagData = (diagRes.data as DiagnosticoMelhoria[]) || [];

        // Fallback for legacy data without resumo_id
        if (splitsData.length === 0 && diagData.length === 0) {
          const [fallbackSplits, fallbackDiag] = await Promise.all([
            supabase.from('tempos_splits').select('*').eq('atleta_id', user!.id).is('resumo_id', null),
            supabase.from('diagnostico_melhoria').select('*').eq('atleta_id', user!.id).is('resumo_id', null),
          ]);
          splitsData = (fallbackSplits.data as Split[]) || [];
          diagData = (fallbackDiag.data as DiagnosticoMelhoria[]) || [];
        }

        setSplits(splitsData);
        setDiagnosticos(diagData);
      } catch (err) {
        console.error('Error fetching detail:', err);
      } finally {
        setLoadingDetail(false);
      }
    }

    fetchDetail();
  }, [user, selectedResumoId]);

  // Filter out invalid N/A-only records from display
  const validResumos = allResumos.filter(r => {
    const fields = [r.evento, r.nome_atleta, r.finish_time];
    return fields.some(v => v && v !== 'N/A' && v.trim() !== '');
  });
  
  const selectedResumo = allResumos.find(r => r.id === selectedResumoId) || null;
  const selectedIsInvalid = selectedResumo && !validResumos.find(r => r.id === selectedResumo.id);

  async function handleDeleteDiagnostic() {
    if (!user || !selectedResumoId) return;
    setDeleting(true);
    try {
      await supabase.from('diagnostico_resumo').delete().eq('id', selectedResumoId);
      await Promise.all([
        supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id).is('resumo_id', null),
        supabase.from('tempos_splits').delete().eq('atleta_id', user.id).is('resumo_id', null),
      ]);
      setSelectedResumoId(null);
      setLocalRefresh(v => v + 1);
      toast.success('Diagnóstico apagado com sucesso.');
    } catch (err) {
      console.error('Error deleting diagnostic:', err);
      toast.error('Erro ao apagar diagnóstico.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAllDiagnostics() {
    if (!user) return;
    setDeleting(true);
    try {
      await supabase.from('diagnostico_resumo').delete().eq('atleta_id', user.id);
      await Promise.all([
        supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
        supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
      ]);
      setSelectedResumoId(null);
      setAllResumos([]);
      setLocalRefresh(v => v + 1);
      toast.success('Todos os diagnósticos foram apagados.');
    } catch (err) {
      console.error('Error deleting all diagnostics:', err);
      toast.error('Erro ao apagar diagnósticos.');
    } finally {
      setDeleting(false);
    }
  }

  /** Retry fetching detailed diagnostic for a resumo that was saved as partial */
  async function handleRetryDiagnostic() {
    if (!user || !selectedResumo) return;
    setRetrying(true);
    try {
      const proxyResult = await supabase.functions.invoke('proxy-roxcoach', {
        body: {
          athlete_name: selectedResumo.nome_atleta || '',
          event_name: selectedResumo.evento || '',
          division: selectedResumo.divisao || '',
          season_id: parseInt(selectedResumo.temporada || '0', 10),
          result_url: selectedResumo.source_url || '',
        },
      });

      if (proxyResult.error) throw new Error(proxyResult.error.message);
      const proxyData = proxyResult.data;
      if (proxyData?.ok === false) {
        toast.error('Diagnóstico detalhado ainda indisponível. Tente novamente mais tarde.');
        return;
      }

      const parsed = parseDiagnosticResponse(proxyData, user.id, selectedResumo.source_url || '');
      if (!hasDiagnosticData(parsed)) {
        toast.error('Diagnóstico detalhado ainda indisponível.');
        return;
      }

      const resumoId = selectedResumo.id;

      // Update resumo with full data
      if (parsed.resumoRow.texto_ia || parsed.resumoRow.run_total || parsed.resumoRow.workout_total) {
        await supabase.from('diagnostico_resumo').update({
          texto_ia: parsed.resumoRow.texto_ia,
          run_total: parsed.resumoRow.run_total,
          workout_total: parsed.resumoRow.workout_total,
          posicao_categoria: parsed.resumoRow.posicao_categoria,
          posicao_geral: parsed.resumoRow.posicao_geral,
        }).eq('id', resumoId);
      }

      if (parsed.diagRows.length > 0) {
        const rows = parsed.diagRows.map(r => ({ ...r, resumo_id: resumoId }));
        await supabase.from('diagnostico_melhoria').insert(rows);
      }
      if (parsed.splitRows.length > 0) {
        const rows = parsed.splitRows.map(r => ({ ...r, resumo_id: resumoId }));
        await supabase.from('tempos_splits').insert(rows);
      }

      toast.success('Diagnóstico detalhado carregado com sucesso! 🔥');
      setLocalRefresh(v => v + 1);
    } catch (err: any) {
      console.error('Retry diagnostic error:', err);
      toast.error('Erro ao tentar carregar diagnóstico. Tente novamente mais tarde.');
    } finally {
      setRetrying(false);
    }
  }

  const hasOnlyInvalidData = allResumos.length > 0 && validResumos.length === 0;

  /** Extract location from event name like "2025 Sao Paulo • HYROX PRO" */
  function extractLocation(evento: string | null): string {
    if (!evento) return '';
    const parts = evento.split('•')[0]?.trim() || evento;
    // Remove leading year
    return parts.replace(/^\d{4}\s+/, '').trim();
  }

  function extractSeason(temporada: string | null, evento: string | null): string {
    if (temporada) return temporada;
    if (evento) {
      const yearMatch = evento.match(/^(\d{4})/);
      if (yearMatch) return yearMatch[1];
    }
    return '';
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      {selectedResumo?.nome_atleta && selectedResumo.nome_atleta !== 'N/A' && (
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Diagnóstico OUTLIER: {selectedResumo.nome_atleta}
          </h2>
        </div>
      )}

      {/* Race Cards - Latest on top, others below */}
      {!loading && validResumos.length > 0 && (() => {
        const latestResumo = validResumos[0];
        const olderResumos = validResumos.slice(1);
        const latestLocation = extractLocation(latestResumo.evento);
        const latestSeason = extractSeason(latestResumo.temporada, latestResumo.evento);
        const latestIsActive = latestResumo.id === selectedResumoId;

        return (
          <div className="space-y-4">
            {/* PROVA ATUAL */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Prova Atual
              </h3>
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedResumoId(latestResumo.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ring-2 ring-primary/50 ${
                  latestIsActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <span className={`text-sm font-bold ${latestIsActive ? 'text-primary' : 'text-foreground'}`}>
                      {latestLocation || 'Prova'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[11px] text-muted-foreground">
                        {latestSeason} {latestResumo.divisao ? `· ${latestResumo.divisao}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {latestResumo.finish_time && (
                  <span className={`text-lg font-extrabold ${latestIsActive ? 'text-primary' : 'text-foreground'}`}>
                    {latestResumo.finish_time}
                  </span>
                )}
              </motion.button>
            </div>

            {/* OUTRAS PROVAS */}
            {olderResumos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Outras Provas
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {olderResumos.map((resumo) => {
                    const isActive = resumo.id === selectedResumoId;
                    const location = extractLocation(resumo.evento);
                    const season = extractSeason(resumo.temporada, resumo.evento);

                    return (
                      <motion.button
                        key={resumo.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setSelectedResumoId(resumo.id)}
                        className={`flex-shrink-0 flex flex-col items-start gap-1 px-4 py-3 rounded-xl border transition-all text-left min-w-[150px] ${
                          isActive
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                          <span className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {location || 'Prova'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-[11px] text-muted-foreground truncate">
                            {season} {resumo.divisao ? `· ${resumo.divisao}` : ''}
                          </span>
                        </div>
                        {resumo.finish_time && (
                          <span className={`text-sm font-extrabold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {resumo.finish_time}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}

      {/* Detail loading */}
      {!loading && loadingDetail && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando diagnóstico...</span>
        </div>
      )}

      {/* Data sections */}
      {!loading && !loadingDetail && selectedResumo && !selectedIsInvalid && (
        <>
          {/* Partial diagnostic banner */}
          {diagnosticos.length === 0 && splits.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Diagnóstico detalhado pendente</p>
                <p className="text-xs text-muted-foreground">A análise detalhada não estava disponível no momento da importação.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-primary border-primary/30 hover:bg-primary/10 flex-shrink-0"
                onClick={handleRetryDiagnostic}
                disabled={retrying}
              >
                {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {retrying ? 'Tentando...' : 'Tentar novamente'}
              </Button>
            </motion.div>
          )}

          <PerformanceHighlights resumo={selectedResumo} />
          
          {/* Split times table - always visible */}
          <SplitTimesGrid splits={splits} />

          <ParecerPremium
            resumo={selectedResumo}
            diagnosticos={diagnosticos}
            onToggleFullAnalysis={() => setShowFullAnalysis(v => !v)}
            showFullAnalysis={showFullAnalysis}
          />

          <EvolutionProjectionCard finishTime={selectedResumo.finish_time} diagnosticos={diagnosticos} />

          {showFullAnalysis && (
            <>
              <ImprovementTable diagnosticos={diagnosticos} splits={splits} />
            </>
          )}

          {/* Actions */}
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

            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2">
                    <Trash2 className="w-4 h-4" />
                    Apagar este
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar diagnóstico?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O diagnóstico de "{selectedResumo.evento}" será apagado permanentemente.
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

              {allResumos.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2">
                      <Trash2 className="w-4 h-4" />
                      Excluir todos
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir todos os diagnósticos?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todos os {allResumos.length} diagnósticos serão apagados permanentemente. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllDiagnostics} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deleting ? 'Apagando...' : 'Sim, excluir todos'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {showImporter && (
            <RoxCoachExtractor mode="diagnostic_only" onSuccess={() => { setLocalRefresh(v => v + 1); setShowImporter(false); }} />
          )}
        </>
      )}

      {/* Invalid data state - records exist but all N/A */}
      {!loading && hasOnlyInvalidData && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Diagnóstico incompleto</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Os diagnósticos existentes não contêm dados válidos. Faça uma <strong className="text-primary">prova oficial HYROX</strong> e importe novamente para desbloquear seu diagnóstico completo.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2 mt-2"
              onClick={handleDeleteAllDiagnostics}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Limpando...' : 'Limpar registros inválidos'}
            </Button>
          </div>
          <RoxCoachExtractor mode="diagnostic_only" onSuccess={() => setLocalRefresh(v => v + 1)} />
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasData && !hasOnlyInvalidData && (
        <RoxCoachExtractor mode="diagnostic_only" onSuccess={() => setLocalRefresh(v => v + 1)} />
      )}
    </div>
  );
}
