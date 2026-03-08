import { useEffect, useState } from 'react';
import { Zap, Trash2, Loader2, MapPin, Calendar } from 'lucide-react';
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
import RoxCoachExtractor from './RoxCoachExtractor';
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

  const hasData = allResumos.length > 0;

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
      {selectedResumo?.nome_atleta && (
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Diagnóstico OUTLIER: {selectedResumo.nome_atleta}
          </h2>
        </div>
      )}

      {/* Race Cards - Latest on top, others below */}
      {!loading && allResumos.length > 0 && (() => {
        const latestResumo = allResumos[0];
        const olderResumos = allResumos.slice(1);
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
      {!loading && !loadingDetail && selectedResumo && (
        <>
          <PerformanceHighlights resumo={selectedResumo} />
          
          {/* Split times table - always visible */}
          <SplitTimesGrid splits={splits} />

          <ParecerPremium
            resumo={selectedResumo}
            diagnosticos={diagnosticos}
            onToggleFullAnalysis={() => setShowFullAnalysis(v => !v)}
            showFullAnalysis={showFullAnalysis}
          />

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

      {/* Empty state */}
      {!loading && !hasData && (
        <RoxCoachExtractor mode="diagnostic_only" onSuccess={() => setLocalRefresh(v => v + 1)} />
      )}
    </div>
  );
}
