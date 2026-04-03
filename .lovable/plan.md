

## Plano: Fix Tour Guiado — Persistência por Usuário

### Problema

O tour usa `localStorage.getItem('outlier_onboarding_tour_seen')` sem diferenciar por usuário. Se alguém faz logout e cria outra conta no mesmo browser, o tour não aparece porque a key já existe da conta anterior.

### Solução

Incluir o `userId` na key do localStorage para isolar o estado por conta.

### Alterações

**`src/hooks/useOnboardingTour.ts`**
- Mudar a key de `outlier_onboarding_tour_seen` para `outlier_onboarding_tour_seen_${userId}`
- Aceitar `userId` como parâmetro ou obtê-lo internamente via `useAuth`
- `shouldShowTour()` passa a checar a key com userId

**`src/components/OnboardingTour.tsx`**
- Passar o userId do contexto de auth para o hook (se necessário)

**`src/hooks/useCoachOnboardingTour.ts`**
- Mesmo fix: keys `outlier_coach_onboarding_seen_${userId}` e `outlier_coach_tour_seen_${userId}`

### Impacto
- Cada conta tem seu próprio estado de tour
- Contas existentes que já viram o tour: a key antiga fica órfã (sem efeito), o tour aparece uma vez com a nova key — comportamento aceitável
- Sem migration, sem mudança de banco

