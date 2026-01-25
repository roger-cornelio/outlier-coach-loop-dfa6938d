/**
 * Utility para determinar o nome de exibição de um usuário/coach
 * 
 * Regras de fallback:
 * 1. name (nome de exibição definido pelo usuário)
 * 2. Se name parece ser email, usar apenas a parte antes do @
 * 3. Fallback para email prefix
 * 4. Último fallback: 'Usuário'
 */

interface ProfileLike {
  name?: string | null;
  email?: string | null;
  full_name?: string | null;
  display_name?: string | null;
}

/**
 * Verifica se uma string parece ser um email
 */
function looksLikeEmail(str: string): boolean {
  return str.includes('@') && str.includes('.');
}

/**
 * Extrai o prefixo do email (parte antes do @)
 */
function getEmailPrefix(email: string): string {
  return email.split('@')[0] || email;
}

/**
 * Retorna o nome de exibição de um perfil
 * Prioriza nome real sobre email, com fallbacks inteligentes
 */
export function getDisplayName(profile: ProfileLike | null | undefined): string {
  if (!profile) return 'Usuário';
  
  // Prioridade 1: display_name (se existir no futuro)
  if (profile.display_name && !looksLikeEmail(profile.display_name)) {
    return profile.display_name;
  }
  
  // Prioridade 2: full_name (se existir)
  if (profile.full_name && !looksLikeEmail(profile.full_name)) {
    return profile.full_name;
  }
  
  // Prioridade 3: name - mas verificar se não é email
  if (profile.name) {
    if (looksLikeEmail(profile.name)) {
      // Se o nome é um email, usar apenas o prefixo
      return getEmailPrefix(profile.name);
    }
    return profile.name;
  }
  
  // Prioridade 4: Usar email prefix
  if (profile.email) {
    return getEmailPrefix(profile.email);
  }
  
  // Fallback final
  return 'Usuário';
}

/**
 * Retorna o nome de exibição de um coach
 * Mesma lógica de getDisplayName, com fallback específico
 */
export function getCoachDisplayName(coachProfile: ProfileLike | null | undefined): string {
  if (!coachProfile) return 'Coach';
  
  const displayName = getDisplayName(coachProfile);
  return displayName === 'Usuário' ? 'Coach' : displayName;
}
