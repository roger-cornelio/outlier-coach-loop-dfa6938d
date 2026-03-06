/**
 * Event confidence scoring and minimum requirements validation
 */

export interface EventData {
  nome?: string | null;
  data_evento?: string | null;
  cidade?: string | null;
  estado?: string | null;
  url_origem?: string | null;
  url_inscricao?: string | null;
  organizador?: string | null;
  origem_principal?: string | null;
}

export interface ConfidenceResult {
  score: number;
  meetsMinimum: boolean;
  pendencias: string[];
}

const TRUSTED_ORIGINS = ['HYROX', 'SYMPLA'];

/**
 * Calculate confidence score (0-100) for an event
 * Heuristic:
 *   nome: +20, data: +20, cidade: +15, estado: +10,
 *   link inscricao/publicacao: +15, origem confiável: +10, organizador: +10
 */
export function calculateConfidence(event: EventData): ConfidenceResult {
  let score = 0;
  const pendencias: string[] = [];

  if (event.nome) score += 20; else pendencias.push('sem_nome');
  if (event.data_evento) score += 20; else pendencias.push('sem_data');
  if (event.cidade) score += 15; else pendencias.push('sem_cidade');
  if (event.estado) score += 10; else pendencias.push('sem_estado');
  if (event.url_origem || event.url_inscricao) score += 15; else pendencias.push('sem_fonte');
  if (event.origem_principal && TRUSTED_ORIGINS.includes(event.origem_principal)) score += 10;
  if (event.organizador) score += 10; else pendencias.push('sem_organizador');

  // Minimum requirements: nome + data + cidade + estado + fonte + at least one link
  const hasMinimum = Boolean(
    event.nome &&
    event.data_evento &&
    event.cidade &&
    event.estado &&
    (event.url_origem || event.url_inscricao)
  );

  return { score, meetsMinimum: hasMinimum, pendencias };
}

/**
 * Generate search suggestions for admin based on event name
 */
export function generateSearchSuggestions(nome: string, cidade?: string | null): string[] {
  const base = nome.replace(/['"]/g, '');
  const suggestions = [
    `"${base}"`,
    `"${base}" inscrição`,
    `"${base}" sympla`,
    `"${base}" instagram`,
  ];

  if (cidade) {
    suggestions.unshift(`"${base}" ${cidade}`);
  }

  suggestions.push(
    `"${base}" fitness race`,
    `"${base}" hybrid race`,
    `"${base}" hyrox`,
  );

  return suggestions;
}

/**
 * Map pendencia codes to human-readable labels
 */
export function pendenciaLabel(code: string): string {
  const map: Record<string, string> = {
    sem_nome: 'Nome ausente',
    sem_data: 'Data ausente',
    sem_cidade: 'Cidade ausente',
    sem_estado: 'Estado ausente',
    sem_fonte: 'Sem link de origem/inscrição',
    sem_organizador: 'Organizador desconhecido',
    dados_conflitantes: 'Dados conflitantes',
  };
  return map[code] || code;
}

export const TIPO_EVENTO_LABELS: Record<string, string> = {
  OFICIAL: 'Oficial HYROX',
  PARALELA: 'Paralela',
  SIMULADO: 'Simulado',
};

export const STATUS_LABELS: Record<string, string> = {
  VALIDADA: 'Validada',
  AGUARDANDO_AUTORIZACAO_ADMIN: 'Pendente',
  REJEITADA: 'Rejeitada',
  RASCUNHO: 'Rascunho',
  DUPLICADA: 'Duplicada',
};

export const ORIGEM_LABELS: Record<string, string> = {
  HYROX: 'HYROX',
  SYMPLA: 'Sympla',
  SITE_ORGANIZADOR: 'Site organizador',
  BUSCA_EXTERNA: 'Busca externa',
  MANUAL: 'Manual',
};
