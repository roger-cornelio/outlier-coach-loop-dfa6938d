import { UserStatus, LeadScore } from "./types";

export function computeUserStatus(
  lastActiveAt: string | null,
  coachId: string | null,
  profileStatus: string | null
): UserStatus {
  if (profileStatus === "suspended") return "suspenso";
  
  const now = Date.now();
  const lastActive = lastActiveAt ? new Date(lastActiveAt).getTime() : 0;
  const daysSinceActive = lastActiveAt ? (now - lastActive) / (1000 * 60 * 60 * 24) : Infinity;
  
  if (coachId && daysSinceActive <= 14) return "ativo";
  if (coachId) return "vinculado";
  if (daysSinceActive > 14) return "inativo";
  return "sem_coach";
}

export function computeLeadScore(
  sessionCount: number,
  firstSetupCompleted: boolean | null,
  lastActiveAt: string | null,
  hasDiagnosticOnly: boolean
): LeadScore {
  if (hasDiagnosticOnly) return "cold";
  
  const now = Date.now();
  const lastActive = lastActiveAt ? new Date(lastActiveAt).getTime() : 0;
  const daysSinceActive = lastActiveAt ? (now - lastActive) / (1000 * 60 * 60 * 24) : Infinity;
  
  if (daysSinceActive > 30) return "cold";
  if (sessionCount > 10 || (firstSetupCompleted && daysSinceActive <= 14)) return "hot";
  if (sessionCount < 5) return "warm";
  return "warm";
}

export function formatPlatformDuration(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (totalDays < 1) return "Hoje";
  if (totalDays < 30) return `${totalDays} dia${totalDays !== 1 ? "s" : ""}`;
  
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  
  let result = `${months} ${months === 1 ? "mês" : "meses"}`;
  if (days > 0) result += ` e ${days} dia${days !== 1 ? "s" : ""}`;
  return result;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const statusLabels: Record<UserStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  vinculado: "Vinculado",
  sem_coach: "Sem Coach",
  suspenso: "Suspenso",
  so_diagnostico: "Só Diagnóstico",
};

export const statusColors: Record<UserStatus, string> = {
  ativo: "bg-green-500/15 text-green-700 dark:text-green-400",
  inativo: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  vinculado: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  sem_coach: "bg-muted text-muted-foreground",
  suspenso: "bg-destructive/15 text-destructive",
  so_diagnostico: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
};

export const leadScoreLabels: Record<LeadScore, string> = {
  hot: "Hot 🔥",
  warm: "Warm 🟡",
  cold: "Cold 🔵",
};

export const leadScoreColors: Record<LeadScore, string> = {
  hot: "bg-red-500/15 text-red-700 dark:text-red-400",
  warm: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  cold: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};
