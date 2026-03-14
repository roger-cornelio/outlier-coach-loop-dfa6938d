/**
 * dslAutoFormat.ts - Auto-formatação determinística para DSL de treino
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * REGRA DETERMINÍSTICA (ANTI-ERRO):
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Dentro de um BLOCO que contém uma STRUCTURE (**...**):
 * - Qualquer linha não vazia que:
 *   - NÃO começa com "("
 *   - NÃO começa com "**"
 *   - NÃO começa com "BLOCO:"
 *   - NÃO começa com "DIA:"
 *   - NÃO começa com "-"
 *   - NÃO é linha de estrutura pura (ex: "5 Rounds")
 * => Converter para "- <linha>" no rawText
 * 
 * OBJETIVO:
 * - Reduzir erros de "hífen faltando" sem heurística
 * - 100% determinístico: mesma entrada = mesma saída
 * 
 * PERFORMANCE: O(n) single-pass via pré-computação de flags
 */

// Padrões de linha estrutural que NÃO devem receber hífen
const STRUCTURAL_PATTERNS: RegExp[] = [
  /^\d+\s+Rounds?$/i,          // "5 Rounds", "3 rounds"
  /^EMOM\s+\d+/i,              // "EMOM 30", "EMOM 10'"
  /^AMRAP\s+\d+/i,             // "AMRAP 15", "AMRAP 20'"
  /^For\s+Time$/i,             // "For Time"
  /^RFT$/i,                    // "RFT" (Rounds For Time)
  /^Tabata$/i,                 // "Tabata"
  /^E\d+M(?:OM)?$/i,           // "E2MOM", "E3MOM"
  /^Every\s+\d+\s*(?:min|')/i, // "Every 2 min", "Every 3'"
  /^Time\s*cap\s*:?\s*\d+/i,   // "Time cap: 20"
  /^\d+\s*['']?\s*Time\s*cap/i, // "20' Time cap"
];

/**
 * Verifica se uma linha é estrutural (não deve receber hífen)
 */
function isStructuralLine(line: string): boolean {
  const trimmed = line.trim();
  return STRUCTURAL_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Verifica se a linha deve ser ignorada pelo autoformat
 */
function shouldIgnoreLine(line: string): boolean {
  const trimmed = line.trim();
  
  if (!trimmed) return true; // Linha vazia
  if (trimmed.startsWith('(')) return true; // Comentário
  if (trimmed.startsWith('**')) return true; // Estrutura
  if (/^BLOCO:\s*/i.test(trimmed)) return true; // Marcador de bloco
  if (/^DIA:\s*/i.test(trimmed)) return true; // Marcador de dia
  if (trimmed.startsWith('-')) return true; // Já tem hífen
  if (trimmed.startsWith('>')) return true; // Marcador de comentário legado
  if (trimmed.startsWith('=')) return true; // Marcador de treino legado
  if (trimmed === '⸻') return true; // Separador
  if (isStructuralLine(trimmed)) return true; // Linha estrutural
  
  return false;
}

/**
 * Pré-computa flags de "dentro de bloco estruturado" para todas as linhas.
 * Single-pass forward O(n) — substitui o antigo isInsideStructuredBlock O(n²).
 */
function computeStructuredBlockFlags(lines: string[]): boolean[] {
  const flags = new Array<boolean>(lines.length).fill(false);
  
  let inBlock = false;
  let hasStructureInCurrentBlock = false;
  // Índice da primeira linha após o último "BLOCO:" encontrado
  let blockContentStart = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Novo DIA: reseta contexto
    if (/^DIA:\s*/i.test(trimmed)) {
      // Se o bloco anterior tinha estrutura, marcar retroativamente
      if (inBlock && hasStructureInCurrentBlock && blockContentStart >= 0) {
        for (let j = blockContentStart; j < i; j++) {
          flags[j] = true;
        }
      }
      inBlock = false;
      hasStructureInCurrentBlock = false;
      blockContentStart = -1;
      continue;
    }
    
    // Novo BLOCO: reseta contexto de bloco (mas mantém DIA)
    if (/^BLOCO:\s*/i.test(trimmed)) {
      // Finalizar bloco anterior se tinha estrutura
      if (inBlock && hasStructureInCurrentBlock && blockContentStart >= 0) {
        for (let j = blockContentStart; j < i; j++) {
          flags[j] = true;
        }
      }
      inBlock = true;
      hasStructureInCurrentBlock = false;
      blockContentStart = i + 1;
      continue;
    }
    
    // Detectar estrutura **...**
    if (inBlock && /^\*\*[^*]+\*\*$/.test(trimmed)) {
      hasStructureInCurrentBlock = true;
    }
  }
  
  // Finalizar último bloco se tinha estrutura
  if (inBlock && hasStructureInCurrentBlock && blockContentStart >= 0) {
    for (let j = blockContentStart; j < lines.length; j++) {
      flags[j] = true;
    }
  }
  
  return flags;
}

/**
 * Auto-formata o texto DSL, adicionando hífen em linhas de exercício
 * que estão dentro de blocos estruturados.
 * 
 * @param rawText - Texto DSL original
 * @returns Texto DSL formatado com hífens adicionados
 */
export function autoFormatDSL(rawText: string): string {
  const lines = rawText.split('\n');
  const structuredFlags = computeStructuredBlockFlags(lines);
  const formattedLines: string[] = [];
  let changesCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Se deve ignorar, manter como está
    if (shouldIgnoreLine(trimmed)) {
      formattedLines.push(line);
      continue;
    }
    
    // Verificar se está dentro de bloco estruturado (O(1) lookup)
    if (structuredFlags[i]) {
      // Adicionar hífen preservando indentação
      const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
      formattedLines.push(`${leadingWhitespace}- ${trimmed}`);
      changesCount++;
    } else {
      formattedLines.push(line);
    }
  }
  
  // Log para debug
  if (changesCount > 0 && import.meta.env?.DEV && import.meta.env?.VITE_DEBUG_PARSER === 'true') {
    console.log(`[AUTOFORMAT] Adicionados ${changesCount} hífens`);
  }

  return formattedLines.join('\n');
}

/**
 * Verifica se o texto tem linhas que seriam formatadas pelo autoformat
 * Útil para mostrar preview antes de aplicar
 * 
 * PERFORMANCE: O(n) via pré-computação de flags
 */
export function previewAutoFormatChanges(rawText: string): {
  hasChanges: boolean;
  changesCount: number;
  affectedLines: { lineNumber: number; original: string; formatted: string }[];
} {
  const lines = rawText.split('\n');
  const structuredFlags = computeStructuredBlockFlags(lines);
  const affectedLines: { lineNumber: number; original: string; formatted: string }[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (shouldIgnoreLine(trimmed)) continue;
    
    if (structuredFlags[i]) {
      const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
      affectedLines.push({
        lineNumber: i + 1,
        original: line,
        formatted: `${leadingWhitespace}- ${trimmed}`,
      });
    }
  }
  
  return {
    hasChanges: affectedLines.length > 0,
    changesCount: affectedLines.length,
    affectedLines,
  };
}
