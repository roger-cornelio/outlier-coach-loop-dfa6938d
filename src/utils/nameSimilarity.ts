/**
 * Checks whether two names are "similar enough" to allow diagnostic search.
 * Rule: at least one word from the registered name must appear in the typed name (or vice-versa).
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function extractWords(s: string): string[] {
  return normalize(s)
    .split(/\s+/)
    .filter(w => w.length >= 2); // ignore single-char particles like "e", "a"
}

export function isNameSimilar(registeredName: string, typedName: string): boolean {
  if (!registeredName || !typedName) return false;

  const regWords = extractWords(registeredName);
  const typedWords = extractWords(typedName);

  if (regWords.length === 0 || typedWords.length === 0) return false;

  // At least one word in common
  return regWords.some(rw => typedWords.some(tw => rw === tw || tw === rw));
}
