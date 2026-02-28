/**
 * RacesDashboardCard — Shows Prova Alvo + Satélites on the dashboard
 * with countdown and predicted time
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Orbit, Calendar, ChevronRight, Plus } from 'lucide-react';
import { useAthleteRaces, type AthleteRace } from '@/hooks/useAthleteRaces';
import { useTargetTimes } from '@/hooks/useTargetTimes';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useOutlierStore } from '@/store/outlierStore';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m${String(s).padStart(2, '0')}s`;
  return `${m}m${String(s).padStart(2, '0')}s`;
}

export function RacesDashboardCard() {
  const navigate = useNavigate();
  const { provaAlvo, provasSatelite, loading } = useAthleteRaces();
  const { status } = useAthleteStatus();
  const { athleteConfig } = useOutlierStore();
  const targetTimes = useTargetTimes(status, athleteConfig?.sexo || 'masculino');

  const countdown = useMemo(() => {
    if (!provaAlvo) return null;
    const days = differenceInDays(parseISO(provaAlvo.race_date), new Date());
    return days;
  }, [provaAlvo]);

  if (loading) return null;

  // Empty state — CTA to register
  if (!provaAlvo && provasSatelite.length === 0) {
    return (
      <button
        onClick={() => navigate('/prova-alvo')}
        className="w-full card-elevated p-5 flex items-center gap-4 hover:bg-secondary/50 transition-colors group text-left"
      >
        <div className="p-3 rounded-xl bg-primary/10 shrink-0">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">Cadastre sua Prova Alvo</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina seu objetivo competitivo da temporada
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
      </button>
    );
  }

  return (
    <div className="card-elevated p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg">Provas da Temporada</h3>
        </div>
        <button
          onClick={() => navigate('/prova-alvo')}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Gerenciar
        </button>
      </div>

      {/* Prova Alvo */}
      {provaAlvo && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary uppercase tracking-wide">Prova Alvo</span>
              </div>
              <p className="font-semibold text-foreground">{provaAlvo.nome}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(provaAlvo.race_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>

            {/* Countdown */}
            {countdown !== null && countdown >= 0 && (
              <div className="text-center shrink-0">
                <div className="text-2xl font-display text-primary leading-none">{countdown}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">dias</div>
              </div>
            )}
          </div>

          {/* Predicted time */}
          {targetTimes && (
            <div className="flex items-center gap-3 pt-2 border-t border-primary/10">
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Previsão de tempo</p>
                <p className="text-lg font-display text-foreground">
                  {formatTime(targetTimes.targetSeconds)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meta</p>
                <p className="text-sm font-semibold text-primary">{targetTimes.targetLabel}</p>
              </div>
            </div>
          )}

          {/* Category badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {provaAlvo.categoria}
            </span>
            {provaAlvo.participation_type === 'DUPLA' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                Dupla{provaAlvo.partner_name ? ` · ${provaAlvo.partner_name}` : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Provas Satélite */}
      {provasSatelite.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Orbit className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Provas Satélite ({provasSatelite.length})
            </span>
          </div>
          {provasSatelite.map(race => (
            <RaceMiniCard key={race.id} race={race} />
          ))}
        </div>
      )}
    </div>
  );
}

function RaceMiniCard({ race }: { race: AthleteRace }) {
  const daysUntil = differenceInDays(parseISO(race.race_date), new Date());

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{race.nome}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {format(parseISO(race.race_date), "dd MMM yyyy", { locale: ptBR })}
          <span className="text-muted-foreground/60">· {race.categoria}</span>
        </p>
      </div>
      {daysUntil >= 0 && (
        <div className="text-right shrink-0 ml-2">
          <span className="text-sm font-display text-muted-foreground">{daysUntil}d</span>
        </div>
      )}
    </div>
  );
}
