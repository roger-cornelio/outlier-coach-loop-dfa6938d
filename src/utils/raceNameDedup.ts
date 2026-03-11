/**
 * Remove redundâncias no nome composto de prova.
 * Ex: "HYROX SÃO PAULO SÃO PAULO 2026" → "HYROX SÃO PAULO 2026"
 * Ex: "HYROX RIO DE JANEIRO RIO DE JANEIRO 2026" → "HYROX RIO DE JANEIRO 2026"
 */
export function deduplicateRaceName(nome: string): string {
  if (!nome) return nome;

  // Normalize whitespace
  const cleaned = nome.replace(/\s+/g, ' ').trim();
  const upper = cleaned.toUpperCase();

  // Strategy: find longest repeated substring (word-boundary aligned)
  const words = upper.split(' ');
  const len = words.length;

  // Try progressively smaller window sizes (city names can be 1-4 words)
  for (let windowSize = Math.floor(len / 2); windowSize >= 1; windowSize--) {
    for (let i = 0; i <= len - 2 * windowSize; i++) {
      const chunk = words.slice(i, i + windowSize).join(' ');
      const nextStart = i + windowSize;
      const nextChunk = words.slice(nextStart, nextStart + windowSize).join(' ');

      if (chunk === nextChunk && chunk.length >= 2) {
        // Found duplicate — remove the second occurrence
        const result = [
          ...words.slice(0, i + windowSize),
          ...words.slice(nextStart + windowSize),
        ].join(' ');
        // Recurse in case of multiple duplications
        return deduplicateRaceName(result);
      }
    }
  }

  return cleaned;
}
