

## Plano: Fix — Click no Coach do Diagnóstico Não Faz Nada

### Causa raiz

O componente `OnboardingCoachSelection` tenta vincular o coach no banco (`coach_athletes.insert`) e precisa de `user?.id` para isso. Na página de diagnóstico gratuito, **o usuário não está logado**, então `user?.id` é `null` e a função `handleSelectCoach` retorna imediatamente sem chamar `onCoachSelected`.

O callback que salva no localStorage e redireciona para `/login` nunca é executado.

### Solução

Modificar `OnboardingCoachSelection` para aceitar um modo "somente seleção" (sem vinculação no banco). Quando usado no diagnóstico gratuito (sem usuário logado), o componente deve apenas chamar `onCoachSelected` com os dados do coach, sem tentar inserir no banco.

### Implementação

**`src/components/OnboardingCoachSelection.tsx`**:

1. Adicionar prop opcional `skipLinking?: boolean` (default `false`)
2. No `handleSelectCoach`: se `skipLinking` é `true`, chamar `onCoachSelected` direto sem fazer insert no banco
3. Se `skipLinking` é `false` (uso no WelcomeScreen), manter comportamento atual com vinculação

**`src/pages/DiagnosticoGratuito.tsx`**:

1. Passar `skipLinking={true}` ao `OnboardingCoachSelection`

### Arquivo afetado

- `src/components/OnboardingCoachSelection.tsx` — nova prop + guard no handleSelectCoach
- `src/pages/DiagnosticoGratuito.tsx` — passar `skipLinking`

