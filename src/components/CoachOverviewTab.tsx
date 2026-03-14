/**
 * CoachOverviewTab — "Radar de Retenção" do Coach
 * 
 * KPI Cards (verde/amarelo/vermelho) + Lista de Intervenção virtualizada
 * Ordenação: pior → melhor (churn_risk no topo)
 * Drawer lateral com detalhes do atleta
 */

import { useState, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCoachOverview, classifyRisk, type AthleteOverview, type RiskLevel } from '@/hooks/useCoachOverview';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/UserAvatar';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  XCircle,
  MessageCircle,
  Loader2,
  Activity,
  Calendar,
  Dumbbell,
  RefreshCcw,
} from 'lucide-react';
import { getDisplayName } from '@/utils/displayName';
import { motion } from 'framer-motion';

// ─── KPI Card ───
function KPICard({
  label,
  count,
  total,
  icon: Icon,
  colorClass,
  borderClass,
}: {
  label: string;
  count: number;
  total: number;
  icon: React.ElementType;
  colorClass: string;
  borderClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Card className={`border ${borderClass} bg-card min-w-0`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${colorClass} truncate`}>{label}</span>
          <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${colorClass}`} />
        </div>
        <p className={`text-2xl sm:text-3xl font-bold ${colorClass}`}>{count}</p>
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

// ─── Athlete Row ───
function AthleteRow({
  athlete,
  onClick,
}: {
  athlete: AthleteOverview;
  onClick: () => void;
}) {
  const risk = classifyRisk(athlete);
  const adherencePct = Math.min(100, athlete.workouts_last_7_days * 20); // 5 workouts = 100%
  
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Oi ${athlete.athlete_name?.split(' ')[0] || 'atleta'}! Vi que faz ${athlete.days_inactive} dias que você não treina. Bora voltar? 💪`
  )}`;

  const borderColor = risk === 'churn_risk' 
    ? 'border-l-red-500' 
    : risk === 'attention' 
    ? 'border-l-amber-500' 
    : 'border-l-emerald-500';

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-l-2 ${borderColor} bg-card hover:bg-secondary/40 cursor-pointer transition-colors rounded-r-lg`}
      onClick={onClick}
    >
      <UserAvatar
        name={athlete.athlete_name || athlete.athlete_email}
        gender={athlete.sexo as 'masculino' | 'feminino' | null}
        size="sm"
      />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {athlete.athlete_name || athlete.athlete_email.split('@')[0]}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <RiskBadge risk={risk} />
          {athlete.training_level && (
            <span className="text-[10px] text-muted-foreground uppercase">{athlete.training_level}</span>
          )}
        </div>
      </div>

      {/* Days inactive */}
      <div className="text-center min-w-[48px]">
        <p className={`text-lg font-bold ${
          athlete.days_inactive >= 4 ? 'text-red-400' : 
          athlete.days_inactive >= 2 ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          {athlete.days_inactive}
        </p>
        <p className="text-[10px] text-muted-foreground">dias</p>
      </div>

      {/* Adherence bar */}
      <div className="w-20 hidden sm:block">
        <Progress 
          value={adherencePct} 
          className="h-1.5 bg-secondary"
        />
        <p className="text-[10px] text-muted-foreground text-center mt-0.5">{adherencePct}%</p>
      </div>

      {/* WhatsApp button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="p-2 rounded-md bg-secondary hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 transition-colors"
        title="Enviar mensagem via WhatsApp"
      >
        <MessageCircle className="w-4 h-4" />
      </a>
    </div>
  );
}

// ─── Athlete Detail Drawer ───
function AthleteDetailDrawer({
  athlete,
  open,
  onClose,
}: {
  athlete: AthleteOverview | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!athlete) return null;
  
  const risk = classifyRisk(athlete);
  const adherencePct = Math.min(100, athlete.workouts_last_7_days * 20);

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={athlete.athlete_name || athlete.athlete_email}
              gender={athlete.sexo as 'masculino' | 'feminino' | null}
              size="lg"
            />
            <div>
              <DrawerTitle className="text-lg">
                {athlete.athlete_name || athlete.athlete_email.split('@')[0]}
              </DrawerTitle>
              <DrawerDescription className="text-xs">{athlete.athlete_email}</DrawerDescription>
            </div>
            <div className="ml-auto">
              <RiskBadge risk={risk} />
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* Quick stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Calendar} label="Dias Ausente" value={`${athlete.days_inactive}`} 
              color={athlete.days_inactive >= 4 ? 'text-red-400' : athlete.days_inactive >= 2 ? 'text-amber-400' : 'text-emerald-400'} />
            <StatCard icon={Dumbbell} label="Treinos (7d)" value={`${athlete.workouts_last_7_days}`}
              color={athlete.workouts_last_7_days >= 3 ? 'text-emerald-400' : 'text-amber-400'} />
            <StatCard icon={Activity} label="Adesão" value={`${adherencePct}%`}
              color={adherencePct >= 60 ? 'text-emerald-400' : 'text-amber-400'} />
            <StatCard icon={TrendingUp} label="Benchmarks" value={`${athlete.total_benchmarks}`}
              color="text-primary" />
          </div>

          {/* Adherence progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Adesão Semanal</span>
              <span className="text-xs font-medium text-foreground">{adherencePct}%</span>
            </div>
            <Progress value={adherencePct} className="h-2 bg-secondary" />
          </div>

          {/* Biometrics */}
          {(athlete.peso || athlete.altura) && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Biometria</span>
              <div className="flex gap-4 mt-1.5">
                {athlete.peso && <span className="text-sm text-foreground">{athlete.peso}kg</span>}
                {athlete.altura && <span className="text-sm text-foreground">{athlete.altura}cm</span>}
              </div>
            </div>
          )}

          {/* WhatsApp CTA */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Oi ${athlete.athlete_name?.split(' ')[0] || 'atleta'}! Vi que faz ${athlete.days_inactive} dias que você não treina. Bora voltar? 💪`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Contatar via WhatsApp
          </a>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Main Component ───
export function CoachOverviewTab() {
  const { athletes, kpis, loading, error, refetch } = useCoachOverview();
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteOverview | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: athletes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  const handleAthleteClick = useCallback((athlete: AthleteOverview) => {
    setSelectedAthlete(athlete);
    setDrawerOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 mx-auto text-destructive/50 mb-3" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Header */}
      <div className="grid grid-cols-3 gap-3">
        <KPICard
          label="Em Alta"
          count={kpis.highPerformance}
          total={kpis.total}
          icon={TrendingUp}
          colorClass="text-emerald-400"
          borderClass="border-emerald-500/30"
        />
        <KPICard
          label="Atenção"
          count={kpis.attention}
          total={kpis.total}
          icon={AlertTriangle}
          colorClass="text-amber-400"
          borderClass="border-amber-500/30"
        />
        <KPICard
          label="Risco de Churn"
          count={kpis.churnRisk}
          total={kpis.total}
          icon={XCircle}
          colorClass="text-red-400"
          borderClass="border-red-500/30"
        />
      </div>

      {/* List header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Lista de Intervenção
          <span className="text-muted-foreground font-normal">({athletes.length})</span>
        </h2>
        <Button variant="ghost" size="sm" onClick={refetch} className="text-muted-foreground">
          <RefreshCcw className="w-3.5 h-3.5 mr-1" />
          Atualizar
        </Button>
      </div>

      {/* Column headers */}
      {athletes.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">
          <div className="w-8" /> {/* avatar space */}
          <div className="flex-1">Atleta</div>
          <div className="w-12 text-center">Ausente</div>
          <div className="w-20 text-center hidden sm:block">Adesão</div>
          <div className="w-10" /> {/* action */}
        </div>
      )}

      {/* Virtualized list */}
      {athletes.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum atleta vinculado.</p>
        </div>
      ) : (
        <div
          ref={parentRef}
          className="max-h-[calc(100vh-380px)] overflow-auto rounded-lg"
          style={{ contain: 'strict' }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const athlete = athletes[virtualItem.index];
              return (
                <div
                  key={athlete.athlete_id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <AthleteRow
                    athlete={athlete}
                    onClick={() => handleAthleteClick(athlete)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Athlete Detail Drawer */}
      <AthleteDetailDrawer
        athlete={selectedAthlete}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
