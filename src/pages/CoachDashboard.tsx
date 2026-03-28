/**
 * CoachDashboard - Painel COMPLETO do Coach
 * 
 * Tabs:
 * - IMPORTAR: Cole e processe planilha (preview local)
 * - PROGRAMAÇÕES: Semanas salvas/publicadas (dados do banco)
 * 
 * Regras:
 * - Apenas coach, admin ou superadmin podem acessar (protegido por AppGate)
 * - Coach NUNCA acessa /app (fluxo de atleta)
 * - IMPORTAR = preview local; PROGRAMAÇÕES = dados persistidos
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import { useLinkDebug } from '@/hooks/useLinkDebug';
import { useQADebugMode } from '@/hooks/useQADebugMode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Users, LogOut, FileText,
  LayoutGrid, Send, Trash2, UserPlus, UserMinus,
  AlertTriangle, Upload, Calendar, Eye, MessageSquare, Pencil, Check, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { motion } from 'framer-motion';
import { CoachSpreadsheetTab } from '@/components/CoachSpreadsheetTab';
import { CoachOverviewTab } from '@/components/CoachOverviewTab';
import { CoachProgramsTab } from '@/components/CoachProgramsTab';
import { CoachFeedbacksTab } from '@/components/CoachFeedbacksTab';

import type { CoachWorkout } from '@/hooks/useCoachWorkouts';
import { LinkAthleteModal } from '@/components/LinkAthleteModal';
import { CoachSuspensionActions } from '@/components/UserSuspensionActions';
import { useToast } from '@/hooks/use-toast';
import { AthleteStatus, LEVEL_NAMES } from '@/types/outlier';
import { calculateAthleteStatus, type AthleteGender } from '@/utils/athleteStatusSystem';
import { getDisplayName, getCoachDisplayName } from '@/utils/displayName';

interface LinkedAthlete {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  // Status REAL do atleta (calculado de benchmarks via calculateAthleteStatus)
  athleteStatus?: AthleteStatus | null;
  sexo?: string | null;
  // Account status (active/suspended)
  accountStatus: 'active' | 'suspended';
}

interface DiagnosticCounts {
  linksCount: number | null;
  joinCount: number | null;
  profilesSample: string | null;
  error: string | null;
}

export default function CoachDashboard() {
  const { profile, isAdmin, isSuperAdmin, refreshProfile, updateProfileOptimistic } = useAuth();
  const { logout, isLoggingOut } = useLogout();
  const { toast } = useToast();
  const { isQAActive } = useQADebugMode();
  const { setDiagnosticCounts, setFetchResult } = useLinkDebug();

  // Coach display name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  const coachDisplayName = getCoachDisplayName(profile);
  const nameNeedsSetup = !profile?.name || profile.name.includes('@');

  const handleStartEditName = () => {
    setNameInput(nameNeedsSetup ? '' : (profile?.name || ''));
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !profile?.user_id) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: trimmed })
        .eq('user_id', profile.user_id);
      if (error) throw error;
      updateProfileOptimistic({ name: trimmed });
      await refreshProfile();
      setIsEditingName(false);
      toast({ title: 'Nome atualizado!', description: `Seus atletas verão "${trimmed}" como seu nome.` });
    } catch (err) {
      toast({ title: 'Erro ao salvar nome', variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  // Estado unificado de atletas - FONTE ÚNICA
  const [linkedAthletes, setLinkedAthletes] = useState<LinkedAthlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [athletesError, setAthletesError] = useState<string | null>(null);
  const [lastFetchOk, setLastFetchOk] = useState<boolean | null>(null);
  
  const [showLinkAthleteModal, setShowLinkAthleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [editingWorkout, setEditingWorkout] = useState<CoachWorkout | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticCounts>({
    linksCount: null,
    joinCount: null,
    profilesSample: null,
    error: null,
  });

  // FONTE ÚNICA: busca atletas via coach_athletes + profiles separadamente
  const fetchAthletes = async (): Promise<boolean> => {
    console.log('[CoachDashboard] fetchAthletes called');
    setLoadingAthletes(true);
    setAthletesError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        console.error('[CoachDashboard] No authenticated user');
        setLinkedAthletes([]);
        setAthletesError('Usuário não autenticado');
        setLastFetchOk(false);
        return false;
      }

      console.log('[CoachDashboard] Fetching for coach_id:', user.id);

      // Step 1: Get links from coach_athletes
      const { data: links, error: linksError } = await supabase
        .from('coach_athletes')
        .select('athlete_id')
        .eq('coach_id', user.id);

      if (linksError) {
        console.error('[CoachDashboard] Links error:', linksError);
        setLinkedAthletes([]);
        setAthletesError(linksError.message);
        setLastFetchOk(false);
        return false;
      }

      console.log('[CoachDashboard] Links found:', links?.length ?? 0);

      if (!links || links.length === 0) {
        setLinkedAthletes([]);
        setLastFetchOk(true);
        return true;
      }

      // Step 2: Get profiles for each athlete_id
      const athleteIds = links.map(l => l.athlete_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, sexo, status')
        .in('user_id', athleteIds);

      if (profilesError) {
        console.error('[CoachDashboard] Profiles error:', profilesError);
        setLinkedAthletes([]);
        setAthletesError(`Erro ao buscar perfis: ${profilesError.message}`);
        setLastFetchOk(false);
        return false;
      }

      console.log('[CoachDashboard] Profiles found:', profiles?.length ?? 0);

      // Step 3: Get benchmark_results for all athletes to calculate status
      const { data: benchmarks, error: benchmarksError } = await supabase
        .from('benchmark_results')
        .select('user_id, bucket, completed, time_in_seconds, score, result_type, event_name, event_date, race_category')
        .in('user_id', athleteIds);

      if (benchmarksError) {
        console.warn('[CoachDashboard] Benchmarks error (non-fatal):', benchmarksError);
      }

      // Group benchmarks by user_id and calculate status using the official function
      const benchmarksByUser: Record<string, typeof benchmarks> = {};
      (benchmarks || []).forEach(b => {
        if (!benchmarksByUser[b.user_id]) benchmarksByUser[b.user_id] = [];
        benchmarksByUser[b.user_id].push(b);
      });

      const transformedAthletes: LinkedAthlete[] = (profiles || []).map(p => {
        const athleteBenchmarks = benchmarksByUser[p.user_id] || [];
        
        // Use calculateAthleteStatus from athleteStatusSystem
        // Filter benchmarks (only those not result_type 'external' or 'simulado')
        const regularBenchmarks = athleteBenchmarks
          .filter(b => !['external', 'simulado'].includes(b.result_type || ''))
          .map(b => ({
            id: '',
            user_id: b.user_id,
            workout_id: '',
            block_id: '',
            benchmark_id: null,
            completed: b.completed,
            score: b.score ?? null,
            bucket: b.bucket ?? null,
            time_in_seconds: b.time_in_seconds ?? null,
            created_at: '',
          }));
        
        // Get official results (result_type = 'prova_oficial' or 'simulado')
        const officialResults = athleteBenchmarks
          .filter(b => b.result_type === 'prova_oficial' || b.result_type === 'simulado')
          .map(b => ({
            id: '',
            event_name: b.event_name ?? '',
            event_date: b.event_date ?? '',
            time_in_seconds: b.time_in_seconds ?? 0,
            race_category: (b.race_category as 'PRO' | 'OPEN') ?? 'OPEN',
            result_type: (b.result_type as 'prova_oficial' | 'simulado') ?? 'prova_oficial',
            created_at: '',
          }));
        
        const gender: AthleteGender = (p.sexo as AthleteGender) || 'masculino';
        
        let athleteStatus: AthleteStatus | null = null;
        if (regularBenchmarks.length > 0 || officialResults.length > 0) {
          const calculated = calculateAthleteStatus(regularBenchmarks, officialResults, gender);
          athleteStatus = calculated.status;
        }
        
        return {
          id: p.id,
          user_id: p.user_id,
          name: p.name,
          email: p.email,
          athleteStatus,
          sexo: p.sexo,
          accountStatus: (p.status as 'active' | 'suspended') || 'active',
        };
      });

      setLinkedAthletes(transformedAthletes);
      setLastFetchOk(true);
      setFetchResult(true, transformedAthletes.length);
      console.log('[CoachDashboard] linkedAthletes set:', transformedAthletes.length);
      return true;
    } catch (err) {
      console.error('[CoachDashboard] fetchAthletes exception:', err);
      setAthletesError(String(err));
      setLastFetchOk(false);
      setFetchResult(false, 0);
      return false;
    } finally {
      setLoadingAthletes(false);
    }
  };

  // Diagnostic function for QA mode
  const runDiagnostics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setDiagnostics({ linksCount: null, joinCount: null, profilesSample: null, error: 'No user' });
        return;
      }

      // 1. Count links in coach_athletes
      const { count: linksCount, error: linksErr } = await supabase
        .from('coach_athletes')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user.id);

      // 2. Count joins (simplified - just count links and assume profiles exist)
      const { data: joinData, error: joinErr } = await supabase
        .from('coach_athletes')
        .select('athlete_id')
        .eq('coach_id', user.id);

      let joinCount = 0;
      if (joinData && !joinErr) {
        // For each athlete_id, check if profile is readable
        for (const row of joinData) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', row.athlete_id)
            .maybeSingle();
          if (pData) joinCount++;
        }
      }

      // 3. Try to read any profile (test RLS)
      const { data: sampleData, error: sampleErr } = await supabase
        .from('profiles')
        .select('user_id, email')
        .limit(1)
        .maybeSingle();

      const sample = sampleData ? `${sampleData.email?.slice(0, 8)}...` : (sampleErr ? `ERR: ${sampleErr.message}` : 'null');

      const newDiag = {
        linksCount: linksCount ?? 0,
        joinCount,
        profilesSample: sample,
        error: linksErr?.message || joinErr?.message || null,
      };

      setDiagnostics(newDiag);
      setDiagnosticCounts(newDiag.linksCount, newDiag.joinCount, newDiag.profilesSample);

      console.log('[CoachDashboard] Diagnostics:', newDiag);
    } catch (err) {
      console.error('[CoachDashboard] Diagnostics error:', err);
      setDiagnostics({ linksCount: null, joinCount: null, profilesSample: null, error: String(err) });
    }
  };

  // Buscar atletas vinculados ao coach (via coach_athletes)
  useEffect(() => {
    fetchAthletes();
    if (isQAActive) {
      runDiagnostics();
    }
  }, [isQAActive]);

  // Desvincular atleta - remove from coach_athletes
  const handleUnlinkAthlete = async (athleteUserId: string, athleteName: string) => {
    const confirmed = window.confirm(`Desvincular ${athleteName}?`);
    if (!confirmed) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('coach_athletes')
        .delete()
        .eq('coach_id', user.id)
        .eq('athlete_id', athleteUserId);

      if (error) {
        console.error('[CoachDashboard] Unlink error:', error);
        toast({ title: 'Erro ao desvincular', variant: 'destructive' });
      } else {
        toast({ title: 'Atleta desvinculado' });
        await fetchAthletes();
      }
    } catch (err) {
      console.error('[CoachDashboard] Unlink error:', err);
      toast({ title: 'Erro ao desvincular', variant: 'destructive' });
    }
  };

  // Callback para quando vincular atleta com sucesso
  const handleAthleteLinked = async () => {
    console.log('[CoachDashboard] handleAthleteLinked - refetching athletes');
    await fetchAthletes();
    if (isQAActive) {
      await runDiagnostics();
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleEditWorkout = useCallback((workout: CoachWorkout) => {
    setEditingWorkout(workout);
    setActiveTab('importar');
  }, []);

  // Renderizar conteúdo baseado na tab selecionada
  const renderTabContent = () => {
    switch (activeTab) {
      case 'visao-geral':
        return <CoachOverviewTab />;

      case 'atletas':
        return (
          <>
            {/* QA Diagnostic Panel */}
            {isQAActive && (
              <Card className="mb-4 border-amber-500 bg-amber-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    QA Diagnóstico - coach_athletes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground">linksCount:</span>
                      <span className={`ml-2 ${diagnostics.linksCount && diagnostics.linksCount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {diagnostics.linksCount ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">joinCount:</span>
                      <span className={`ml-2 ${diagnostics.joinCount && diagnostics.joinCount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {diagnostics.joinCount ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">profilesSample:</span>
                      <span className="ml-2 text-blue-400">{diagnostics.profilesSample ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">error:</span>
                      <span className="ml-2 text-red-400">{diagnostics.error ?? 'none'}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {diagnostics.linksCount !== null && diagnostics.linksCount > 0 && diagnostics.joinCount === 0 && (
                      <p className="text-amber-400">⚠️ Links existem mas JOIN retorna 0 → RLS de profiles bloqueando</p>
                    )}
                    {diagnostics.linksCount === 0 && (
                      <p className="text-red-400">❌ Nenhum link em coach_athletes → insert não persistindo</p>
                    )}
                    {diagnostics.linksCount !== null && diagnostics.linksCount > 0 && diagnostics.joinCount !== null && diagnostics.joinCount > 0 && (
                      <p className="text-green-400">✅ Links e JOIN funcionando corretamente</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={runDiagnostics}
                  >
                    Re-rodar diagnóstico
                  </Button>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-primary" />
                    Atletas Vinculados
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowLinkAthleteModal(true)}
                    className="flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    Vincular Atleta
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* QA Debug info */}
              {isQAActive && (
                <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded text-xs font-mono">
                  <span className="text-purple-400">linkedAthletes.length: {linkedAthletes.length}</span>
                  <span className="ml-3 text-purple-400">lastFetchOk: {lastFetchOk === null ? 'null' : lastFetchOk ? '✓' : '✗'}</span>
                  {athletesError && <span className="ml-3 text-red-400">error: {athletesError}</span>}
                </div>
              )}
              
              {loadingAthletes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : athletesError ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-10 h-10 mx-auto text-destructive/50 mb-3" />
                  <p className="text-sm text-destructive">{athletesError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => fetchAthletes()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : linkedAthletes.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum atleta vinculado ainda.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowLinkAthleteModal(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Vincular primeiro atleta
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {linkedAthletes.map((athlete) => {
                      // athleteStatus = STATUS REAL calculado de benchmarks (HYROX PRO, Iniciante, etc.)
                      const statusLabel = athlete.athleteStatus 
                        ? LEVEL_NAMES[athlete.athleteStatus]
                        : null;
                      
                      // Cores baseadas no status real
                      const getStatusColors = (status: AthleteStatus | null | undefined) => {
                        switch (status) {
                          case 'elite':
                            return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30';
                          case 'pro':
                            return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                          case 'open':
                            return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                          default:
                            return 'bg-muted text-muted-foreground border-border';
                        }
                      };
                      
                      return (
                        <div
                          key={athlete.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                        >
                          <UserAvatar
                            name={athlete.name || athlete.email}
                            gender={athlete.sexo as 'masculino' | 'feminino' | null}
                            athleteStatus={athlete.athleteStatus}
                            size="md"
                            showGlow
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {getDisplayName(athlete)}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {athlete.name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {athlete.email}
                                </p>
                              )}
                              {statusLabel && (
                                <span className="text-xs text-primary">
                                  • Status atual: {statusLabel}
                                </span>
                              )}
                              {!statusLabel && (
                                <span className="text-xs text-muted-foreground italic">
                                  • Sem benchmarks registrados
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {statusLabel ? (
                              <Badge 
                                variant="outline" 
                                className={getStatusColors(athlete.athleteStatus)}
                              >
                                {statusLabel}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                                Novo
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlinkAthlete(athlete.user_id, athlete.name || athlete.email)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Desvincular atleta"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                            <CoachSuspensionActions
                              userId={athlete.user_id}
                              userName={athlete.name}
                              userEmail={athlete.email}
                              userStatus={athlete.accountStatus}
                              onActionComplete={fetchAthletes}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          </>
        );

      case 'importar':
        return (
          <CoachSpreadsheetTab
            linkedAthletes={linkedAthletes}
            loadingAthletes={loadingAthletes}
            initialWorkout={editingWorkout}
            onClearInitialWorkout={() => setEditingWorkout(null)}
            onSavedGoToPrograms={() => setActiveTab('programacoes')}
          />
        );

      case 'programacoes':
        return (
          <CoachProgramsTab
            linkedAthletes={linkedAthletes}
            loadingAthletes={loadingAthletes}
            onEditWorkout={handleEditWorkout}
          />
        );

      case 'feedbacks':
        return <CoachFeedbacksTab />;


      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-[hsl(0,0%,3%)]">
      {/* Header fixo */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Painel do Coach</p>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Como quer ser chamado?"
                    className="h-9 w-48 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={savingName || !nameInput.trim()} className="h-8 w-8">
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-500" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)} className="h-8 w-8">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  {nameNeedsSetup ? (
                    <button onClick={handleStartEditName} className="text-sm text-primary/70 hover:text-primary transition-colors underline underline-offset-4 decoration-dashed">
                      Defina seu nome →
                    </button>
                  ) : (
                    <>
                      <h1 className="text-xl font-bold text-primary tracking-tight">
                        {coachDisplayName}
                      </h1>
                      <button onClick={handleStartEditName} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </div>
      </header>

      {/* Navegação por Tabs */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full overflow-x-auto no-scrollbar mb-6 gap-1">
            <TabsTrigger value="visao-geral" className="flex-1 min-w-0 gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <Eye className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline truncate">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="atletas" className="flex-1 min-w-0 gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <Users className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline truncate">Atletas</span>
            </TabsTrigger>
            <TabsTrigger value="importar" className="flex-1 min-w-0 gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <Upload className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline truncate">Importar</span>
            </TabsTrigger>
            <TabsTrigger value="programacoes" className="flex-1 min-w-0 gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline truncate">Programações</span>
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="flex-1 min-w-0 gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline truncate">Feedbacks</span>
            </TabsTrigger>
          </TabsList>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </Tabs>
      </div>

      {/* Modal de vincular atleta */}
      <LinkAthleteModal
        open={showLinkAthleteModal}
        onOpenChange={setShowLinkAthleteModal}
        onSuccess={handleAthleteLinked}
      />
    </div>
  );
}
