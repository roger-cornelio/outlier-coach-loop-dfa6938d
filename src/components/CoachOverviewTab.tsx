/**
 * CoachOverviewTab — Aba unificada "Atletas" do Coach
 * 
 * KPI Cards + Lista com linhas expandíveis (Collapsible inline)
 * Cada atleta expande em grid 4 colunas: Stats | Perfil | Feedbacks | Ações
 * Paginação de 50 em 50 para suportar 200+ atletas
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useCoachOverview, classifyRisk, type AthleteOverview, type RiskLevel } from '@/hooks/useCoachOverview';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CoachSuspensionActions } from '@/components/UserSuspensionActions';
import { PeriodFilter, type DateRange } from '@/components/admin/PeriodFilter';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  XCircle,
  MessageCircle,
  Loader2,
  Activity,
  Calendar as CalendarIcon,
  Dumbbell,
  RefreshCcw,
  UserPlus,
  Check,
  X,
  ChevronDown,
  UserMinus,
  Target,
  MessageSquare,
  Search,
} from 'lucide-react';
import { getDisplayName } from '@/utils/displayName';
import { motion } from 'framer-motion';

// ─── Onboarding labels ───
const experienceLabels: Record<string, string> = {
  never: 'Sem experiência HYROX',
  spectator: 'Já assistiu provas',
  '1race': '1 prova realizada',
  '2plus': '2+ provas',
};
const goalLabels: Record<string, string> = {
  finish: 'Completar prova',
  improve_time: 'Melhorar tempo',
  podium: 'Pódio',
  lifestyle: 'Lifestyle',
};
const targetRaceLabels: Record<string, string> = {
  next3months: 'Prova em 3 meses',
  next6months: 'Prova em 6 meses',
  nodate: 'Sem data definida',
  just_training: 'Só quer treinar',
};

const equipmentLabels: Record<string, string> = {
  sled: '🛷 Sled',
  skierg: '⛷️ SkiErg',
  rower: '🚣 Remo',
  bike: '🚴 Bike',
};

// ─── Pending Link Requests ───
interface LinkRequest {
  id: string;
  athlete_id: string;
  athlete_name: string | null;
  athlete_email: string | null;
  created_at: string;
}

function PendingRequestsSection() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('coach_link_requests')
        .select('id, athlete_id, athlete_name, athlete_email, created_at')
        .eq('coach_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests((data as LinkRequest[]) || []);
    } catch (err) {
      console.error('[PendingRequests] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { error } = await supabase.rpc('approve_coach_link_request', { _request_id: requestId });
      if (error) throw error;
      toast.success('Atleta aprovado e vinculado!');
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch {
      toast.error('Erro ao aprovar solicitação.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { error } = await supabase.rpc('reject_coach_link_request', { _request_id: requestId });
      if (error) throw error;
      toast.info('Solicitação recusada.');
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch {
      toast.error('Erro ao recusar solicitação.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading || requests.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        Solicitações de Vínculo
        <Badge variant="outline" className="border-primary/50 text-primary text-xs">{requests.length}</Badge>
      </h2>
      <div className="space-y-2">
        {requests.map((req) => (
          <Card key={req.id} className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <UserAvatar name={req.athlete_name || req.athlete_email || ''} gender={null} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {req.athlete_name || req.athlete_email?.split('@')[0] || 'Atleta'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{req.athlete_email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                  onClick={() => handleReject(req.id)} disabled={processing !== null}>
                  {processing === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 gap-1"
                  onClick={() => handleApprove(req.id)} disabled={processing !== null}>
                  {processing === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Aprovar</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// ─── KPI Card ───
function KPICard({ label, count, total, icon: Icon, colorClass, borderClass }: {
  label: string; count: number; total: number; icon: React.ElementType; colorClass: string; borderClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Card className={`border ${borderClass} bg-card min-w-0`}>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${colorClass} truncate`}>{label}</span>
          <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 shrink-0 ${colorClass}`} />
        </div>
        <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${colorClass}`}>{count}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{pct}% dos atletas</p>
      </CardContent>
    </Card>
  );
}

// ─── Risk badge ───
function RiskBadge({ risk }: { risk: RiskLevel }) {
  switch (risk) {
    case 'high_performance':
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">Em Alta</Badge>;
    case 'attention':
      return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20">Atenção</Badge>;
    case 'churn_risk':
      return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20">Risco</Badge>;
  }
}

// ─── Feedback block result row ───
function formatSecondsToMinSec(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function BlockResultRow({ result }: { result: any }) {
  const { blockTitle, format: fmt, timeInSeconds, estimatedTimeSeconds, reps, estimatedRounds } = result;
  if (fmt === 'amrap' && reps != null && estimatedRounds != null && estimatedRounds > 0) {
    const diff = reps - estimatedRounds;
    return (
      <div className="flex items-center justify-between py-1 text-xs">
        <span className="text-foreground truncate flex-1">{blockTitle}</span>
        <span className="text-muted-foreground">{reps}r</span>
        <span className={`ml-2 font-medium w-12 text-right ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
          {diff > 0 ? '+' : ''}{diff}
        </span>
      </div>
    );
  }
  if ((fmt === 'for_time' || fmt === 'strength') && timeInSeconds && estimatedTimeSeconds && estimatedTimeSeconds > 0) {
    const diff = timeInSeconds - estimatedTimeSeconds;
    return (
      <div className="flex items-center justify-between py-1 text-xs">
        <span className="text-foreground truncate flex-1">{blockTitle}</span>
        <span className="text-muted-foreground">{formatSecondsToMinSec(timeInSeconds)}</span>
        <span className={`ml-2 font-medium w-12 text-right ${diff < -10 ? 'text-green-500' : diff > 10 ? 'text-red-500' : 'text-muted-foreground'}`}>
          {diff < 0 ? '-' : '+'}{formatSecondsToMinSec(Math.abs(diff))}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-foreground truncate flex-1">{blockTitle}</span>
      <span className="text-muted-foreground">✓</span>
    </div>
  );
}

// ─── Inline Feedbacks Column (lazy-loaded with date filter) ───
function AthleteFeedbacksColumn({ athleteId }: { athleteId: string }) {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_session_feedback' as any)
        .select('*')
        .eq('athlete_id', athleteId)
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err) {
      console.error('[AthleteFeedbacks] Error:', err);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  }, [athleteId, dateFrom, dateTo]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Feedbacks</span>
      </div>
      {/* Date filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2">
              <CalendarIcon className="w-3 h-3" />
              {format(dateFrom, 'dd/MM', { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)}
              className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <span className="text-[10px] text-muted-foreground">→</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2">
              <CalendarIcon className="w-3 h-3" />
              {format(dateTo, 'dd/MM', { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)}
              className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : feedbacks.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">Sem feedbacks no período</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {feedbacks.map((fb: any) => {
            const dateStr = new Date(fb.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const isExpanded = expandedId === fb.id;
            return (
              <div key={fb.id} className="border border-border/30 rounded bg-secondary/30">
                <button
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-left hover:bg-secondary/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                >
                  <span className="font-medium text-foreground">{dateStr} — {fb.workout_day || 'Sessão'}</span>
                  {fb.workout_stimulus && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">{fb.workout_stimulus}</Badge>
                  )}
                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1">
                    {fb.block_results?.map((r: any, i: number) => (
                      <BlockResultRow key={i} result={r} />
                    ))}
                    {fb.athlete_comment && (
                      <div className="bg-primary/5 rounded p-1.5 mt-1">
                        <p className="text-[10px] text-foreground">{fb.athlete_comment}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Plan Change Request inline ───
function PlanChangeRequestAlert({ athleteId, onResolved }: { athleteId: string; onResolved: () => void }) {
  const [request, setRequest] = useState<{ id: string; current_plan: string; requested_plan: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('plan_change_requests')
        .select('id, current_plan, requested_plan')
        .eq('athlete_user_id', athleteId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setRequest(data as any);
    };
    fetch();
  }, [athleteId]);

  if (!request) return null;

  const isUpgrade = request.requested_plan === 'pro';
  const planLabel = isUpgrade ? 'PERFORMANCE' : 'ESSENCIAL';

  const handleAction = async (approve: boolean) => {
    setProcessing(true);
    try {
      if (approve) {
        // Update profile training_level
        await supabase
          .from('profiles')
          .update({ training_level: request.requested_plan })
          .eq('user_id', athleteId);
      }
      // Update request status
      await supabase
        .from('plan_change_requests')
        .update({ status: approve ? 'approved' : 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', request.id);

      toast.success(approve ? `Plano alterado para ${planLabel}` : 'Solicitação rejeitada');
      setRequest(null);
      onResolved();
    } catch {
      toast.error('Erro ao processar solicitação');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 mb-3">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">
          🔔 Solicitação de {isUpgrade ? 'UPGRADE' : 'DOWNGRADE'} para {planLabel}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10 px-2"
          onClick={() => handleAction(false)} disabled={processing}>
          {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </Button>
        <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 gap-1"
          onClick={() => handleAction(true)} disabled={processing}>
          {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Aprovar</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Expandable Athlete Row ───
function ExpandableAthleteRow({
  athlete,
  onUnlink,
  onAthleteChanged,
}: {
  athlete: AthleteOverview;
  onUnlink: (id: string, name: string) => void;
  onAthleteChanged: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const risk = classifyRisk(athlete);
  const adherencePct = Math.min(100, athlete.workouts_last_7_days * 20);

  const borderColor = risk === 'churn_risk'
    ? 'border-l-red-500'
    : risk === 'attention'
    ? 'border-l-amber-500'
    : 'border-l-emerald-500';

  const displayName = athlete.athlete_name || athlete.athlete_email.split('@')[0];

  const equipment = Array.isArray(athlete.unavailable_equipment) ? athlete.unavailable_equipment as string[] : [];
  const hasEquipment = equipment.length > 0 || (athlete.equipment_notes && athlete.equipment_notes.trim().length > 0);
  const hasOnboarding = athlete.onboarding_experience || athlete.onboarding_goal || athlete.onboarding_target_race;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Oi ${athlete.athlete_name?.split(' ')[0] || 'atleta'}! Vi que faz ${athlete.days_inactive} dias que você não treina. Bora voltar? 💪`
  )}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div
          className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-l-2 ${borderColor} bg-card hover:bg-secondary/40 cursor-pointer transition-colors rounded-r-lg`}
        >
          <UserAvatar name={displayName} gender={athlete.sexo as 'masculino' | 'feminino' | null} size="sm" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <RiskBadge risk={risk} />
              {athlete.training_level && (
                <span className="text-[10px] text-muted-foreground uppercase">{athlete.training_level}</span>
              )}
            </div>
          </div>

          <div className="text-center min-w-[48px]">
            <p className={`text-lg font-bold ${
              athlete.days_inactive >= 4 ? 'text-red-400' :
              athlete.days_inactive >= 2 ? 'text-amber-400' : 'text-emerald-400'
            }`}>{athlete.days_inactive}</p>
            <p className="text-[10px] text-muted-foreground">dias</p>
          </div>

          <div className="w-20 lg:w-32 hidden sm:block">
            <Progress value={adherencePct} className="h-1.5 bg-secondary" />
            <p className="text-[10px] text-muted-foreground text-center mt-0.5">{adherencePct}%</p>
          </div>

          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-md bg-secondary hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 transition-colors">
            <MessageCircle className="w-4 h-4" />
          </a>

          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className={`border-l-2 ${borderColor} bg-secondary/20 px-3 sm:px-4 py-4 rounded-br-lg`}>
          {/* Plan change request alert */}
          <PlanChangeRequestAlert athleteId={athlete.athlete_id} onResolved={onAthleteChanged} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Col 1: Stats */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-secondary/50 border border-border/30 text-center">
                  <p className={`text-lg font-bold ${athlete.days_inactive >= 4 ? 'text-red-400' : athlete.days_inactive >= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {athlete.days_inactive}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Dias Ausente</p>
                </div>
                <div className="p-2 rounded bg-secondary/50 border border-border/30 text-center">
                  <p className={`text-lg font-bold ${athlete.workouts_last_7_days >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {athlete.workouts_last_7_days}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Treinos (7d)</p>
                </div>
                <div className="p-2 rounded bg-secondary/50 border border-border/30 text-center">
                  <p className={`text-lg font-bold ${adherencePct >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {adherencePct}%
                  </p>
                  <p className="text-[9px] text-muted-foreground">Adesão</p>
                </div>
                <div className="p-2 rounded bg-secondary/50 border border-border/30 text-center">
                  <p className="text-lg font-bold text-primary">{athlete.total_benchmarks}</p>
                  <p className="text-[9px] text-muted-foreground">Benchmarks</p>
                </div>
              </div>
            </div>

            {/* Col 2: Perfil */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perfil</span>
              </div>
              {hasOnboarding && (
                <div className="flex flex-wrap gap-1">
                  {athlete.onboarding_experience && (
                    <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
                      {experienceLabels[athlete.onboarding_experience] || athlete.onboarding_experience}
                    </Badge>
                  )}
                  {athlete.onboarding_goal && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {goalLabels[athlete.onboarding_goal] || athlete.onboarding_goal}
                    </Badge>
                  )}
                  {athlete.onboarding_target_race && (
                    <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
                      {targetRaceLabels[athlete.onboarding_target_race] || athlete.onboarding_target_race}
                    </Badge>
                  )}
                </div>
              )}
              {(athlete.peso || athlete.altura || athlete.sexo || athlete.session_duration) && (
                <div className="flex flex-wrap gap-2 text-xs text-foreground">
                  {athlete.sexo && (
                    <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
                      {athlete.sexo === 'masculino' ? '♂ Masculino' : '♀ Feminino'}
                    </Badge>
                  )}
                  {athlete.peso && <span>{athlete.peso}kg</span>}
                  {athlete.altura && <span>{athlete.altura}cm</span>}
                  {athlete.session_duration && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      ⏱ {athlete.session_duration === 'ilimitado' ? 'Sem limite' : `${athlete.session_duration} min`}
                    </Badge>
                  )}
                </div>
              )}
              {hasEquipment && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-1 mb-1">
                    <Wrench className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] text-amber-400 uppercase font-medium">Restrições</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {equipment.map((eq: string) => (
                      <Badge key={eq} variant="outline" className="text-[9px] border-amber-500/30 text-amber-300">
                        {equipmentLabels[eq] || eq}
                      </Badge>
                    ))}
                  </div>
                  {athlete.equipment_notes?.trim() && (
                    <p className="text-[9px] text-muted-foreground italic mt-1">"{athlete.equipment_notes}"</p>
                  )}
                </div>
              )}
              {!hasOnboarding && !athlete.peso && !athlete.altura && !athlete.sexo && !athlete.session_duration && !hasEquipment && (
                <p className="text-xs text-muted-foreground italic">Sem dados de perfil</p>
              )}
            </div>

            {/* Col 3: Feedbacks */}
            <AthleteFeedbacksColumn athleteId={athlete.athlete_id} />

            {/* Col 4: Ações */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</span>
              </div>
              <div className="space-y-2">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <Button variant="outline" size="sm" className="w-full text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => onUnlink(athlete.athlete_id, displayName)}>
                  <UserMinus className="w-3.5 h-3.5 mr-1.5" /> Desvincular
                </Button>
                <CoachSuspensionActions
                  userId={athlete.athlete_id}
                  userName={athlete.athlete_name}
                  userEmail={athlete.athlete_email}
                  userStatus={(athlete.account_status as 'active' | 'suspended') || 'active'}
                  onActionComplete={onAthleteChanged}
                />
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main Component ───
const PAGE_SIZE = 50;

export function CoachOverviewTab({
  onUnlinkAthlete,
  onShowLinkModal,
  onAthleteChanged,
}: {
  onUnlinkAthlete?: (athleteId: string, name: string) => void;
  onShowLinkModal?: () => void;
  onAthleteChanged?: () => void;
}) {
  const { athletes, kpis, loading, error, refetch } = useCoachOverview();
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(athletes.length / PAGE_SIZE);
  const paginatedAthletes = useMemo(() =>
    athletes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [athletes, page]
  );

  const handleUnlink = useCallback((athleteId: string, name: string) => {
    if (onUnlinkAthlete) {
      onUnlinkAthlete(athleteId, name);
    }
  }, [onUnlinkAthlete]);

  const handleChanged = useCallback(() => {
    refetch();
    onAthleteChanged?.();
  }, [refetch, onAthleteChanged]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 mx-auto text-destructive/50 mb-3" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6">
        <KPICard label="Total Atletas" count={kpis.total} total={kpis.total} icon={Users} colorClass="text-primary" borderClass="border-primary/30" />
        <KPICard label="Em Alta" count={kpis.highPerformance} total={kpis.total} icon={TrendingUp} colorClass="text-emerald-400" borderClass="border-emerald-500/30" />
        <KPICard label="Atenção" count={kpis.attention} total={kpis.total} icon={AlertTriangle} colorClass="text-amber-400" borderClass="border-amber-500/30" />
        <KPICard label="Risco de Churn" count={kpis.churnRisk} total={kpis.total} icon={XCircle} colorClass="text-red-400" borderClass="border-red-500/30" />
      </div>

      {/* Pending Link Requests */}
      <PendingRequestsSection />

      {/* List header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Atletas
          <span className="text-muted-foreground font-normal">({athletes.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          {onShowLinkModal && (
            <Button size="sm" onClick={onShowLinkModal} className="gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Vincular
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={refetch} className="text-muted-foreground">
            <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Athletes list */}
      {athletes.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum atleta vinculado.</p>
          {onShowLinkModal && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onShowLinkModal}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Vincular primeiro atleta
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {paginatedAthletes.map((athlete) => (
            <ExpandableAthleteRow
              key={athlete.athlete_id}
              athlete={athlete}
              onUnlink={handleUnlink}
              onAthleteChanged={handleChanged}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
