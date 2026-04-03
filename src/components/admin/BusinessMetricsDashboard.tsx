import { useState, useEffect, useMemo } from "react";
import { subDays, format, differenceInDays, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PeriodFilter, DateRange, getPreviousPeriod } from "./PeriodFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserCheck, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Minus, Search, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  delta?: number | null;
  subtitle?: string;
}

function KpiCard({ title, value, icon, delta, subtitle }: KpiCardProps) {
  const deltaColor = delta === null || delta === undefined
    ? "text-muted-foreground"
    : delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground";
  const DeltaIcon = delta === null || delta === undefined
    ? Minus : delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {delta !== null && delta !== undefined && (
            <span className={`text-xs flex items-center gap-0.5 ${deltaColor}`}>
              <DeltaIcon className="w-3 h-3" />
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function BusinessMetricsDashboard() {
  const [range, setRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() });
  const [ticketPrice, setTicketPrice] = useState(99);

  // Data states
  const [athleteLinks, setAthleteLinks] = useState<any[]>([]);
  const [prevAthleteLinks, setPrevAthleteLinks] = useState<any[]>([]);
  const [diagnosticLeads, setDiagnosticLeads] = useState<any[]>([]);
  const [prevDiagnosticLeads, setPrevDiagnosticLeads] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const rangeStr = useMemo(() => ({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  }), [range]);

  const prevRange = useMemo(() => getPreviousPeriod(range), [range]);
  const prevRangeStr = useMemo(() => ({
    from: prevRange.from.toISOString(),
    to: prevRange.to.toISOString(),
  }), [prevRange]);

  useEffect(() => {
    fetchData();
  }, [rangeStr.from, rangeStr.to]);

  const fetchData = async () => {
    setLoading(true);
    const [linksRes, prevLinksRes, leadsRes, prevLeadsRes, profilesRes] = await Promise.all([
      supabase.from("coach_athletes").select("*").gte("created_at", rangeStr.from).lte("created_at", rangeStr.to),
      supabase.from("coach_athletes").select("*").gte("created_at", prevRangeStr.from).lte("created_at", prevRangeStr.to),
      supabase.from("diagnostic_leads").select("*").gte("created_at", rangeStr.from).lte("created_at", rangeStr.to),
      supabase.from("diagnostic_leads").select("*").gte("created_at", prevRangeStr.from).lte("created_at", prevRangeStr.to),
      supabase.from("profiles").select("id, user_id, name, role, created_at"),
    ]);

    setAthleteLinks(linksRes.data || []);
    setPrevAthleteLinks(prevLinksRes.data || []);
    setDiagnosticLeads(leadsRes.data || []);
    setPrevDiagnosticLeads(prevLeadsRes.data || []);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  };

  // KPI calculations
  const activeAthleteIds = useMemo(() => new Set(athleteLinks.map((l: any) => l.athlete_id)), [athleteLinks]);
  const prevActiveAthleteIds = useMemo(() => new Set(prevAthleteLinks.map((l: any) => l.athlete_id)), [prevAthleteLinks]);
  const activeCoachIds = useMemo(() => new Set(athleteLinks.map((l: any) => l.coach_id)), [athleteLinks]);
  const prevActiveCoachIds = useMemo(() => new Set(prevAthleteLinks.map((l: any) => l.coach_id)), [prevAthleteLinks]);

  const totalAthletes = activeAthleteIds.size;
  const totalCoaches = activeCoachIds.size;
  const prevTotalAthletes = prevActiveAthleteIds.size;
  const prevTotalCoaches = prevActiveCoachIds.size;

  // Churn: athletes in previous period not in current
  const churnedAthletes = useMemo(() => {
    let count = 0;
    prevActiveAthleteIds.forEach(id => { if (!activeAthleteIds.has(id)) count++; });
    return count;
  }, [activeAthleteIds, prevActiveAthleteIds]);
  const churnRate = prevTotalAthletes > 0 ? (churnedAthletes / prevTotalAthletes) * 100 : 0;

  // LTV: avg tenure × ticket
  const avgTenureDays = useMemo(() => {
    if (athleteLinks.length === 0) return 0;
    const now = new Date();
    const totalDays = athleteLinks.reduce((sum: number, l: any) => {
      return sum + differenceInDays(now, parseISO(l.created_at));
    }, 0);
    return totalDays / athleteLinks.length;
  }, [athleteLinks]);
  const ltv = (avgTenureDays / 30) * ticketPrice;

  // Diagnostic funnel
  const totalDiagnostics = diagnosticLeads.length;
  const convertedDiagnostics = diagnosticLeads.filter((l: any) => l.converted).length;
  const conversionRate = totalDiagnostics > 0 ? (convertedDiagnostics / totalDiagnostics) * 100 : 0;
  const prevTotalDiagnostics = prevDiagnosticLeads.length;
  const unconvertedLeads = diagnosticLeads.filter((l: any) => !l.converted);

  // Chart: diagnostics per day
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; total: number; converted: number }> = {};
    diagnosticLeads.forEach((l: any) => {
      const day = format(parseISO(l.created_at), "dd/MM");
      if (!map[day]) map[day] = { date: day, total: 0, converted: 0 };
      map[day].total++;
      if (l.converted) map[day].converted++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [diagnosticLeads]);

  // Coach metrics table
  const coachMetrics = useMemo(() => {
    const coachMap: Record<string, { name: string; athletes: Set<string>; prevAthletes: Set<string> }> = {};

    athleteLinks.forEach((l: any) => {
      if (!coachMap[l.coach_id]) {
        const p = profiles.find((p: any) => p.user_id === l.coach_id);
        coachMap[l.coach_id] = { name: p?.name || l.coach_id.slice(0, 8), athletes: new Set(), prevAthletes: new Set() };
      }
      coachMap[l.coach_id].athletes.add(l.athlete_id);
    });

    prevAthleteLinks.forEach((l: any) => {
      if (!coachMap[l.coach_id]) {
        const p = profiles.find((p: any) => p.user_id === l.coach_id);
        coachMap[l.coach_id] = { name: p?.name || l.coach_id.slice(0, 8), athletes: new Set(), prevAthletes: new Set() };
      }
      coachMap[l.coach_id].prevAthletes.add(l.athlete_id);
    });

    return Object.entries(coachMap).map(([id, data]) => {
      const lost = [...data.prevAthletes].filter(a => !data.athletes.has(a)).length;
      const retention = data.prevAthletes.size > 0 ? ((data.prevAthletes.size - lost) / data.prevAthletes.size) * 100 : 100;
      return { id, name: data.name, athletes: data.athletes.size, lost, retention };
    }).sort((a, b) => b.athletes - a.athletes);
  }, [athleteLinks, prevAthleteLinks, profiles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PeriodFilter value={range} onChange={setRange} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ticket mensal R$</span>
          <Input
            type="number"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(Number(e.target.value) || 0)}
            className="w-20 h-8 text-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Atletas Vinculados"
          value={totalAthletes}
          icon={<Users className="w-4 h-4" />}
          delta={calcDelta(totalAthletes, prevTotalAthletes)}
          subtitle="vs período anterior"
        />
        <KpiCard
          title="Coaches Ativos"
          value={totalCoaches}
          icon={<UserCheck className="w-4 h-4" />}
          delta={calcDelta(totalCoaches, prevTotalCoaches)}
          subtitle="vs período anterior"
        />
        <KpiCard
          title="Churn Rate"
          value={`${churnRate.toFixed(1)}%`}
          icon={<TrendingDown className="w-4 h-4" />}
          subtitle={`${churnedAthletes} atleta(s) perdido(s)`}
        />
        <KpiCard
          title="Tempo Médio na Plataforma"
          value={avgTenureDays >= 30 ? `${(avgTenureDays / 30).toFixed(1)} meses` : `${avgTenureDays.toFixed(0)} dias`}
          icon={<DollarSign className="w-4 h-4" />}
          subtitle={`${athleteLinks.length} vínculo(s) analisado(s)`}
        />
      </div>

      {/* Diagnostic Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Funil Diagnóstico → Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <div className="text-2xl font-bold">{totalDiagnostics}</div>
              <div className="text-xs text-muted-foreground">Diagnósticos</div>
              <div className="text-xs text-muted-foreground">
                {prevTotalDiagnostics > 0 && (
                  <span className={totalDiagnostics >= prevTotalDiagnostics ? "text-green-500" : "text-red-500"}>
                    {totalDiagnostics >= prevTotalDiagnostics ? "+" : ""}{calcDelta(totalDiagnostics, prevTotalDiagnostics)?.toFixed(0)}% vs anterior
                  </span>
                )}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <div className="text-2xl font-bold text-green-500">{convertedDiagnostics}</div>
              <div className="text-xs text-muted-foreground">Convertidos</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Taxa Conversão</div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" name="Convertidos" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Unconverted leads */}
          {unconvertedLeads.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                Leads não convertidos ({unconvertedLeads.length})
              </h4>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome Buscado</TableHead>
                      <TableHead className="text-xs">Evento</TableHead>
                      <TableHead className="text-xs">Divisão</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unconvertedLeads.slice(0, 50).map((lead: any) => (
                      <TableRow key={lead.id}>
                        <TableCell className="text-xs">{lead.athlete_name_searched}</TableCell>
                        <TableCell className="text-xs">{lead.event_name || "—"}</TableCell>
                        <TableCell className="text-xs">{lead.division || "—"}</TableCell>
                        <TableCell className="text-xs">{format(parseISO(lead.created_at), "dd/MM/yy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coach Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Métricas por Coach
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coachMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de coach no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Coach</TableHead>
                  <TableHead className="text-xs text-center">Atletas</TableHead>
                  <TableHead className="text-xs text-center">Perdidos</TableHead>
                  <TableHead className="text-xs text-center">Retenção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coachMetrics.map((coach) => (
                  <TableRow key={coach.id}>
                    <TableCell className="text-sm font-medium">{coach.name}</TableCell>
                    <TableCell className="text-sm text-center">{coach.athletes}</TableCell>
                    <TableCell className="text-sm text-center text-red-400">{coach.lost}</TableCell>
                    <TableCell className="text-sm text-center">
                      <span className={coach.retention >= 80 ? "text-green-500" : coach.retention >= 50 ? "text-yellow-500" : "text-red-500"}>
                        {coach.retention.toFixed(0)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
