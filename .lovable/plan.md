

## Plano: Tela de confirmação após selecionar coach

### Problema
Após selecionar o coach, o toast aparece mas o `handleFinish()` é chamado imediatamente, navegando para o dashboard. O atleta não tem tempo de ver a confirmação.

### Solução
Em vez de chamar `handleFinish()` direto no `onCoachSelected`, mostrar uma tela intermediária de confirmação dentro do `OnboardingCoachSelection` (nova view `confirmation`).

### Alterações

**`src/components/OnboardingCoachSelection.tsx`**
1. Adicionar `'confirmation'` ao tipo `View`
2. Adicionar state `selectedCoach` para guardar o coach selecionado
3. Após inserir o `coach_link_requests` com sucesso, em vez de chamar `onCoachSelected` imediato, setar `view = 'confirmation'` e guardar o coach
4. Nova view `confirmation` — visual consistente com o onboarding:
   - Ícone de check animado (verde)
   - "SOLICITAÇÃO ENVIADA!" como headline
   - Nome do coach em destaque
   - Texto: "Seu coach receberá a solicitação e poderá aprovar o vínculo. Enquanto isso, vamos configurar sua experiência."
   - Botão "CONTINUAR" que chama `onCoachSelected(selectedCoach)`

**`src/components/WelcomeScreen.tsx`** — sem alteração (o callback já chama `handleFinish`)

### Resultado
O atleta vê uma tela clara de confirmação com o nome do coach antes de avançar para o dashboard.

