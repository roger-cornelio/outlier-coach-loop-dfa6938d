import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Activity, Link2, Target } from "lucide-react";
import { UnifiedUser, AthleteDetail } from "./types";
import {
  statusLabels, statusColors,
  leadScoreLabels, leadScoreColors,
  formatPlatformDuration, fmtDate,
  computeLeadScore,
} from "./utils";

interface Props {
  user: UnifiedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AthleteDetailSheet({ user, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<AthleteDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !open) { setDetail(null); return; }
    loadDetail(user);
  }, [user, open]);

  async function loadDetail(u: UnifiedUser) {
    setLoading(true);
    try {
      const [sessionsRes, benchRes, racesRes, leadsRes] = await Promise.all([
        supabase.from("workout_session_feedback").select("id", { count: "exact", head: true }).eq("athlete_id", u.user_id),
        supabase.from("benchmark_outlier_results").select("id", { count: "exact", head: true }).eq("athlete_id", u.user_id),
        supabase.from("athlete_races").select("id", { count: "exact", head: true }).eq("user_id", u.user_id),
        supabase.from("diagnostic_leads").select("athlete_name_searched, event_name, created_at").eq("user_id", u.user_id).order("created_at", { ascending: false }),
      ]);

      const sessionCount = sessionsRes.count ?? 0;
      const benchmarkCount = benchRes.count ?? 0;
      const raceCount = racesRes.count ?? 0;

      const created = new Date(u.created_at);
      const weeksSinceSignup = Math.max(1, Math.floor((Date.now() - created.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const avgSessionsPerWeek = Math.round((sessionCount / weeksSinceSignup) * 10) / 10;

      setDetail({
        profile: {
          ...u,
          leadScore: computeLeadScore(sessionCount, u.first_setup_completed, u.last_active_at, false),
        },
        sessionCount,
        benchmarkCount,
        raceCount,
        diagnosticLeads: (leadsRes.data ?? []) as any[],
        weeksSinceSignup,
        avgSessionsPerWeek,
        platformDuration: formatPlatformDuration(u.created_at),
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{user?.name || "Sem nome"}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <div className="space-y-6 mt-4">
            {/* Section 1: Profile */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <User className="w-4 h-4" /> Perfil
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoItem label="Email" value={detail.profile.email} />
                <InfoItem label="Sexo" value={detail.profile.sexo === "M" ? "Masculino" : detail.profile.sexo === "F" ? "Feminino" : "—"} />
                <InfoItem label="Idade" value={detail.profile.idade ? `${detail.profile.idade} anos` : null} />
                <InfoItem label="Peso" value={detail.profile.peso ? `${detail.profile.peso} kg` : null} />
                <InfoItem label="Altura" value={detail.profile.altura ? `${detail.profile.altura} cm` : null} />
                <InfoItem label="Nível" value={detail.profile.training_level} />
                <InfoItem label="Duração sessão" value={detail.profile.session_duration} />
                <InfoItem label="Setup completo" value={detail.profile.first_setup_completed ? "Sim ✅" : "Não"} />
              </div>
              {detail.profile.onboarding_experience && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><span className="font-medium">Experiência:</span> {detail.profile.onboarding_experience}</p>
                  {detail.profile.onboarding_goal && <p><span className="font-medium">Objetivo:</span> {detail.profile.onboarding_goal}</p>}
                  {detail.profile.onboarding_target_race && <p><span className="font-medium">Prova alvo:</span> {detail.profile.onboarding_target_race}</p>}
                </div>
              )}
              {detail.profile.equipment_notes && (
                <p className="text-xs text-muted-foreground"><span className="font-medium">Equip. indisp.:</span> {detail.profile.equipment_notes}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={statusColors[detail.profile.computedStatus]}>{statusLabels[detail.profile.computedStatus]}</Badge>
                <span className="text-xs text-muted-foreground">Cadastro: {fmtDate(detail.profile.created_at)}</span>
                {detail.profile.last_active_at && (
                  <span className="text-xs text-muted-foreground">Último acesso: {fmtDate(detail.profile.last_active_at)}</span>
                )}
              </div>
            </section>

            <Separator />

            {/* Section 2: Engagement */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Activity className="w-4 h-4" /> Engajamento
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoItem label="Na plataforma" value={detail.platformDuration} />
                <InfoItem label="Sessões registradas" value={String(detail.sessionCount)} />
                <InfoItem label="Média semanal" value={`${detail.avgSessionsPerWeek} sessões`} />
                <InfoItem label="Benchmarks" value={String(detail.benchmarkCount)} />
                <InfoItem label="Provas cadastradas" value={String(detail.raceCount)} />
              </div>
            </section>

            <Separator />

            {/* Section 3: Coach Link */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Link2 className="w-4 h-4" /> Vínculo
              </h3>
              {detail.profile.coach_name ? (
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Coach:</span> {detail.profile.coach_name}</p>
                  {detail.profile.coach_email && <p className="text-xs text-muted-foreground">{detail.profile.coach_email}</p>}
                  {detail.profile.coach_linked_at && <p className="text-xs text-muted-foreground">Vinculado em {fmtDate(detail.profile.coach_linked_at)}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem coach vinculado</p>
              )}
              {detail.diagnosticLeads.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Diagnósticos ({detail.diagnosticLeads.length})</p>
                  {detail.diagnosticLeads.map((l, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {l.athlete_name_searched} {l.event_name ? `· ${l.event_name}` : ""} · {fmtDate(l.created_at)}
                    </p>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Section 4: Lead Score */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Target className="w-4 h-4" /> Qualificação
              </h3>
              <Badge className={`text-sm ${leadScoreColors[detail.profile.leadScore]}`}>
                {leadScoreLabels[detail.profile.leadScore]}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {detail.profile.leadScore === "hot" && "Usuário engajado com mais de 10 sessões ou setup completo e ativo recentemente."}
                {detail.profile.leadScore === "warm" && "Cadastro completo mas com poucas sessões. Potencial de engajamento."}
                {detail.profile.leadScore === "cold" && "Inativo há mais de 30 dias ou usou apenas o diagnóstico."}
              </p>
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}
