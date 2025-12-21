/**
 * weekCalculations.ts - Funções canônicas para cálculo de semana
 * 
 * REGRA CANÔNICA (ATLETA):
 * - Se hoje é DOMINGO → semana "atual" = próxima segunda-feira
 * - Se hoje é SEG-SÁB → semana "atual" = segunda-feira da semana corrente
 * 
 * FORMATO: Sempre retorna YYYY-MM-DD (ISO), sempre segunda-feira
 */

/**
 * Retorna o início da semana (segunda-feira) para uma data qualquer.
 * Não considera a regra do domingo - use getAthleteCurrentWeekStart para atletas.
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  // Normalizar para meio-dia local para evitar problemas de timezone
  d.setHours(12, 0, 0, 0);
  
  const day = d.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Volta para segunda
  d.setDate(diff);
  
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Retorna o fim da semana (domingo) para uma data qualquer.
 */
export function getWeekEnd(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  
  return d.toISOString().split('T')[0];
}

/**
 * FUNÇÃO CANÔNICA PARA ATLETA
 * 
 * Retorna o week_start "atual" do atleta considerando a regra do domingo:
 * - Se hoje é DOMINGO → retorna PRÓXIMA segunda-feira
 * - Se hoje é SEG-SÁB → retorna segunda-feira da semana corrente
 * 
 * @param now - Data de referência (default: agora)
 * @returns YYYY-MM-DD da segunda-feira
 */
export function getAthleteCurrentWeekStart(now: Date = new Date()): string {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  
  const dayOfWeek = d.getDay(); // 0 = domingo
  
  if (dayOfWeek === 0) {
    // DOMINGO: semana "atual" é a PRÓXIMA segunda-feira
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  } else {
    // SEG-SÁB: semana "atual" é a segunda-feira da semana corrente
    const diff = d.getDate() - dayOfWeek + 1;
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }
}

/**
 * Calcula as 3 semanas permitidas para navegação do atleta: -1, 0, +1
 */
export function getAthleteAllowedWeeks(now: Date = new Date()): {
  prev: string;
  curr: string;
  next: string;
} {
  const currStart = getAthleteCurrentWeekStart(now);
  const currDate = new Date(currStart + 'T12:00:00');
  
  // Semana anterior
  const prevDate = new Date(currDate);
  prevDate.setDate(prevDate.getDate() - 7);
  const prev = prevDate.toISOString().split('T')[0];
  
  // Próxima semana
  const nextDate = new Date(currDate);
  nextDate.setDate(nextDate.getDate() + 7);
  const next = nextDate.toISOString().split('T')[0];
  
  return { prev, curr: currStart, next };
}

/**
 * Formatar label da semana para exibição
 */
export function formatWeekLabel(start: string, end: string): string {
  const startDate = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = startDate.toLocaleDateString('pt-BR', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('pt-BR', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

/**
 * Calcular week_end a partir de week_start (adiciona 6 dias)
 */
export function getWeekEndFromStart(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}
