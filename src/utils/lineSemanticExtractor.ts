/**
 * lineSemanticExtractor.ts — Extrator semântico de linha de treino
 * 
 * Decompõe cada linha em segmentos tipados:
 * movement, duration, distance, reps, load, intensity, cadence, parenthetical
 */

export type SemanticType = 
  | 'movement' 
  | 'duration' 
  | 'distance' 
  | 'reps' 
  | 'load' 
  | 'intensity' 
  | 'cadence' 
  | 'parenthetical'
  | 'hyrox_load';

export interface SemanticSegment {
  type: SemanticType;
  text: string;
  startIndex: number;
}

// ============================================
// METRIC PATTERNS (ordem importa: mais específicos primeiro)
// ============================================

interface MetricPattern {
  type: SemanticType;
  regex: RegExp;
}

const METRIC_PATTERNS: MetricPattern[] = [
  // HYROX load tags — must come BEFORE generic parenthetical
  { type: 'hyrox_load', regex: /\(carga\s+(?:pro|open)\)/gi },

  // Parenthetical — tudo entre parênteses

  // Pace: "pace 4:30/km", "pace 5:00"
  { type: 'cadence', regex: /\bpace\s+\d{1,2}:\d{2}(?:\/km)?\b/gi },

  // Cadence: "60-70 rpm", "80 rpm", "25 km/h"
  { type: 'cadence', regex: /\d+(?:\s*[-–]\s*\d+)?\s*(?:rpm|km\/h|min\/km)\b/gi },

  // Intensity: PSE/RPE/Zona/FC/HR/Max
  { type: 'intensity', regex: /\b(?:pse|rpe)\s*[:=]?\s*\d+/gi },
  { type: 'intensity', regex: /\b(?:zona|zone)\s*\d+/gi },
  { type: 'intensity', regex: /\b(?:fc|hr)\s*[:=]?\s*\d+/gi },
  { type: 'intensity', regex: /\bmax\b/gi },

  // Load: "80kg", "32/24kg", "70%", "60lb", "@80kg", "@75%", "125kgs"
  { type: 'load', regex: /@?\s*\d+(?:\s*\/\s*\d+)?\s*(?:kgs?|lbs?)\b/gi },
  { type: 'load', regex: /@?\s*\d+\s*%/g },

  // Tempo notation: "@3010", "@2111"
  { type: 'load', regex: /@\d{4}\b/g },

  // Distance: "1000m", "5km", "400m"
  { type: 'distance', regex: /\d+(?:[,.]\d+)?\s*km\b/gi },
  { type: 'distance', regex: /\d+(?:[,.]\d+)?\s*m\b/gi },

  // Duration with symbols: 30", 45'', 5', 1'30" (includes smart/curly quotes via explicit Unicode)
  { type: 'duration', regex: /\d+\s*[\u0027\u2018\u2019\u2032]\s*\d+\s*[\u0022\u201C\u201D\u2033\u0027\u2018\u2019\u2032]{1,2}/g },
  { type: 'duration', regex: /\d+\s*[\u0022\u201C\u201D\u2033]{1}/g },
  { type: 'duration', regex: /\d+\s*\u0027{2}/g },
  { type: 'duration', regex: /\d+\s*[\u0027\u2018\u2019\u2032]/g },
  // Duration text: "30seg", "5min", "2h"
  { type: 'duration', regex: /\d+\s*(?:seg(?:undos?)?|sec(?:onds?)?)\b/gi },
  { type: 'duration', regex: /\d+\s*min(?:utos?|utes?)?\b/gi },
  { type: 'duration', regex: /\d+\s*h(?:ora)?s?\b/gi },
  // Duration format: "1:30", "12:00"
  { type: 'duration', regex: /\d{1,2}:\d{2}(?::\d{2})?\b/g },

  // Reps: "5x5", "4x8", "3 rounds", "10 reps"
  { type: 'reps', regex: /\d+\s*[x×]\s*\d+/gi },
  { type: 'reps', regex: /\d+\s*(?:rounds?|rodadas?|séries?|series?|sets?)\b/gi },
  { type: 'reps', regex: /\d+\s*(?:reps?|repetições?|repeticoes?)\b/gi },
  // Cal: "30 cal", "25/20 cal", "cal Air Bike"
  { type: 'reps', regex: /\d+(?:\s*\/\s*\d+)?\s*cal\b/gi },
  { type: 'reps', regex: /^cal\b/gi },

  // Leading unilateral reps: "8/8 Kb Step Box" (must be followed by text, not a unit)
  { type: 'reps', regex: /^\d+\s*\/\s*\d+(?=\s+[a-zA-ZÀ-ÿ])/g },

  // Leading simple reps: "10 Burpees" (only at start, followed by text, not a unit)
  { type: 'reps', regex: /^\d{1,4}(?=\s+[a-zA-ZÀ-ÿ])/g },
];

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Decompõe uma linha de treino em segmentos semânticos.
 * Retorna array na ordem original do texto.
 */
export function extractLineSemantics(line: string): SemanticSegment[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  // Remove leading markers (-, •, *)
  let cleanedLine = trimmed.replace(/^[-•*]\s*/, '');
  // Remove prefixos A-/B-/A1) etc. e guarda
  const prefixMatch = cleanedLine.match(/^([A-Z]\d?\s*[)\-–—]\s*)/i);
  if (prefixMatch) {
    cleanedLine = cleanedLine.slice(prefixMatch[0].length);
  }

  // Track matched ranges to avoid overlaps
  const matchedRanges: Array<{ start: number; end: number; type: SemanticType; text: string }> = [];

  for (const pattern of METRIC_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = regex.exec(cleanedLine)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      // Check overlap with existing matches
      const overlaps = matchedRanges.some(r => 
        (start < r.end && end > r.start)
      );
      
      if (!overlaps) {
        matchedRanges.push({ start, end, type: pattern.type, text: match[0] });
      }

      if (match[0].length === 0) { regex.lastIndex++; }
    }
  }

  // Sort by start position
  matchedRanges.sort((a, b) => a.start - b.start);

  // Build segments: fill gaps with 'movement'
  const segments: SemanticSegment[] = [];
  let cursor = 0;

  for (const range of matchedRanges) {
    // Gap before this match → movement
    if (range.start > cursor) {
      const gapText = cleanedLine.slice(cursor, range.start).trim();
      if (gapText) {
        segments.push({ type: 'movement', text: gapText, startIndex: cursor });
      }
    }
    segments.push({ type: range.type, text: range.text, startIndex: range.start });
    cursor = range.end;
  }

  // Remaining text after last match → movement
  if (cursor < cleanedLine.length) {
    const remaining = cleanedLine.slice(cursor).trim();
    if (remaining) {
      segments.push({ type: 'movement', text: remaining, startIndex: cursor });
    }
  }

  // If no metrics found, entire line is movement
  if (segments.length === 0) {
    segments.push({ type: 'movement', text: cleanedLine, startIndex: 0 });
  }

  return segments;
}

/**
 * Extrai apenas o nome do movimento de uma linha (para comparação com dicionário).
 */
export function extractMovementName(line: string): string {
  const segments = extractLineSemantics(line);
  const movementParts = segments
    .filter(s => s.type === 'movement')
    .map(s => s.text.trim())
    .filter(Boolean);
  
  // Remove leading unilateral reps (e.g. "8/8 Kb Step Box" → "Kb Step Box")
  let movement = movementParts.join(' ').trim();
  movement = movement.replace(/^\d+\s*\/\s*\d+\s+/, '');
  // Remove leading simple reps (e.g. "10 Burpees" → "Burpees")
  movement = movement.replace(/^\d+\s+/, '');
  // Remove trailing isolated numbers
  movement = movement.replace(/\s+\d+$/, '');
  
  return movement;
}

// ============================================
// LABELS E CORES PARA UI
// ============================================

export const SEMANTIC_COLORS: Record<SemanticType, { bg: string; text: string; border: string; label: string }> = {
  movement:      { bg: 'bg-transparent',       text: 'text-foreground',        border: '',                       label: 'Exercício' },
  duration:      { bg: 'bg-blue-500/15',       text: 'text-blue-500',          border: 'border-blue-500/30',     label: 'Duração' },
  distance:      { bg: 'bg-emerald-500/15',    text: 'text-emerald-500',       border: 'border-emerald-500/30',  label: 'Distância' },
  reps:          { bg: 'bg-amber-500/15',      text: 'text-amber-600',         border: 'border-amber-500/30',    label: 'Repetições' },
  load:          { bg: 'bg-red-500/15',        text: 'text-red-500',           border: 'border-red-500/30',      label: 'Carga' },
  intensity:     { bg: 'bg-red-600/20',        text: 'text-red-400',           border: 'border-red-600/30',      label: 'Intensidade' },
  cadence:       { bg: 'bg-purple-500/15',     text: 'text-purple-500',        border: 'border-purple-500/30',   label: 'Cadência' },
  parenthetical: { bg: 'bg-transparent',       text: 'text-muted-foreground',  border: '',                       label: 'Nota' },
  hyrox_load:    { bg: 'bg-orange-500/15',      text: 'text-orange-500',        border: 'border-orange-500/30',   label: 'Carga HYROX' },
};
