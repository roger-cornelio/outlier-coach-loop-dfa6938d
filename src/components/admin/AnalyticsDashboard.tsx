import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, TrendingUp, Calendar, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventRow {
  event_name: string;
  created_at: string;
  user_id: string;
}

export function AnalyticsDashboard() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await (supabase
        .from('events') as any)
        .select('event_name, created_at, user_id')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    if (!events.length) return null;

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    // DAU: distinct users today
    const todayUsers = new Set(
      events
        .filter(e => e.event_name === 'app_opened' && e.created_at.startsWith(today))
        .map(e => e.user_id)
    );

    // WAU: distinct users last 7 days
    const weekAgo = subDays(now, 7).toISOString();
    const wauUsers = new Set(
      events
        .filter(e => e.event_name === 'app_opened' && e.created_at >= weekAgo)
        .map(e => e.user_id)
    );

    // MAU: distinct users last 30 days
    const mauUsers = new Set(
      events
        .filter(e => e.event_name === 'app_opened')
        .map(e => e.user_id)
    );

    // DAU trend (last 30 days)
    const dauByDay = new Map<string, Set<string>>();
    events
      .filter(e => e.event_name === 'app_opened')
      .forEach(e => {
        const day = e.created_at.substring(0, 10);
        if (!dauByDay.has(day)) dauByDay.set(day, new Set());
        dauByDay.get(day)!.add(e.user_id);
      });

    const dauTrend: { date: string; label: string; dau: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(now, i);
      const key = format(d, 'yyyy-MM-dd');
      const label = format(d, 'dd/MM', { locale: ptBR });
      dauTrend.push({
        date: key,
        label,
        dau: dauByDay.get(key)?.size || 0,
      });
    }

    // Top events
    const eventCounts = new Map<string, number>();
    events.forEach(e => {
      eventCounts.set(e.event_name, (eventCounts.get(e.event_name) || 0) + 1);
    });
    const topEvents = Array.from(eventCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // D7 retention: users who opened in first 7 days AND also in last 7 days
    const firstWeekEnd = subDays(now, 23).toISOString(); // days 30-23
    const firstWeekStart = subDays(now, 30).toISOString();
    const firstWeekUsers = new Set(
      events
        .filter(e => e.event_name === 'app_opened' && e.created_at >= firstWeekStart && e.created_at < firstWeekEnd)
        .map(e => e.user_id)
    );
    const returnedUsers = new Set(
      events
        .filter(e => e.event_name === 'app_opened' && e.created_at >= weekAgo && firstWeekUsers.has(e.user_id))
        .map(e => e.user_id)
    );
    const retention = firstWeekUsers.size > 0
      ? Math.round((returnedUsers.size / firstWeekUsers.size) * 100)
      : 0;

    return {
      dau: todayUsers.size,
      wau: wauUsers.size,
      mau: mauUsers.size,
      retention,
      dauTrend,
      topEvents,
      totalEvents: events.length,
    };
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Nenhum dado de analytics encontrado nos últimos 30 dias.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="DAU (Hoje)"
          value={metrics.dau}
          icon={<Users className="w-5 h-5" />}
        />
        <KPICard
          title="WAU (7 dias)"
          value={metrics.wau}
          icon={<Calendar className="w-5 h-5" />}
        />
        <KPICard
          title="MAU (30 dias)"
          value={metrics.mau}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          title="Retenção D7"
          value={`${metrics.retention}%`}
          icon={<Activity className="w-5 h-5" />}
          subtitle={metrics.retention >= 40 ? 'Saudável' : 'Atenção'}
        />
      </div>

      {/* DAU Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuários Ativos Diários (DAU)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.dauTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval={4}
                  className="fill-muted-foreground"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [`${value} usuários`, 'DAU']}
                />
                <Line
                  type="monotone"
                  dataKey="dau"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Top Eventos ({metrics.totalEvents.toLocaleString()} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.topEvents.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [`${value}x`, 'Contagem']}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ title, value, icon, subtitle }: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
