import { useState, useMemo } from 'react';
import { useCoachFeedbacks, type SessionFeedbackRecord } from '@/hooks/useAthleteFeedbacks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDisplayName } from '@/utils/displayName';

function formatSecondsToMinSec(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function BlockResultRow({ result }: { result: any }) {
  const { blockTitle, format, timeInSeconds, estimatedTimeSeconds, reps, estimatedRounds } = result;

  // AMRAP
  if (format === 'amrap' && reps != null && estimatedRounds != null && estimatedRounds > 0) {
    const diff = reps - estimatedRounds;
    const isPositive = diff > 0;
    const isNeutral = diff === 0;
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
        <p className="text-sm font-medium text-foreground truncate flex-1">{blockTitle}</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{reps} rounds</span>
          <span className="text-muted-foreground/60">est. ~{estimatedRounds}</span>
          {isNeutral ? (
            <span className="text-muted-foreground font-medium w-16 text-right">no alvo 🎯</span>
          ) : (
            <span className={`font-medium w-16 text-right ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{diff}
            </span>
          )}
        </div>
      </div>
    );
  }

  // FOR TIME
  if ((format === 'for_time' || format === 'strength') && timeInSeconds && estimatedTimeSeconds && estimatedTimeSeconds > 0) {
    const diff = timeInSeconds - estimatedTimeSeconds;
    const isPositive = diff < -10; // faster is positive
    const isNegative = diff > 10;
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
        <p className="text-sm font-medium text-foreground truncate flex-1">{blockTitle}</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{formatSecondsToMinSec(timeInSeconds)}</span>
          <span className="text-muted-foreground/60">est. {formatSecondsToMinSec(estimatedTimeSeconds)}</span>
          {!isPositive && !isNegative ? (
            <span className="text-muted-foreground font-medium w-16 text-right">no tempo</span>
          ) : (
            <span className={`font-medium w-16 text-right ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {diff < 0 ? '-' : '+'}{formatSecondsToMinSec(Math.abs(diff))}
            </span>
          )}
        </div>
      </div>
    );
  }

  // EMOM / other
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <p className="text-sm font-medium text-foreground truncate flex-1">{blockTitle}</p>
      <span className="text-xs text-muted-foreground">Concluído ✓</span>
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: SessionFeedbackRecord }) {
  const displayName = feedback.athlete_name || feedback.athlete_email?.split('@')[0] || 'Atleta';
  const dateStr = new Date(feedback.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{feedback.workout_day} — {dateStr}</p>
          </div>
          {feedback.workout_stimulus && (
            <Badge variant="secondary" className="text-[10px]">{feedback.workout_stimulus}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Block results */}
        {feedback.block_results && feedback.block_results.length > 0 && (
          <div className="space-y-0">
            {feedback.block_results.map((r: any, i: number) => (
              <BlockResultRow key={i} result={r} />
            ))}
          </div>
        )}

        {/* Athlete comment */}
        {feedback.athlete_comment && (
          <div className="bg-secondary/50 rounded-lg p-3 mt-2">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Feedback do atleta</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{feedback.athlete_comment}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CoachFeedbacksTab() {
  const { feedbacks, isLoading } = useCoachFeedbacks();
  const [filterAthlete, setFilterAthlete] = useState<string>('all');

  // Unique athletes for filter
  const athletes = useMemo(() => {
    const map = new Map<string, string>();
    feedbacks.forEach(f => {
      if (!map.has(f.athlete_id)) {
        map.set(f.athlete_id, f.athlete_name || f.athlete_email?.split('@')[0] || 'Atleta');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [feedbacks]);

  const filtered = useMemo(() => {
    if (filterAthlete === 'all') return feedbacks;
    return feedbacks.filter(f => f.athlete_id === filterAthlete);
  }, [feedbacks, filterAthlete]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Feedbacks dos Atletas
        </h2>
        {athletes.length > 1 && (
          <Select value={filterAthlete} onValueChange={setFilterAthlete}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar atleta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {athletes.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum feedback recebido ainda</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          {filtered.map((fb, idx) => (
            <motion.div
              key={fb.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <FeedbackCard feedback={fb} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
