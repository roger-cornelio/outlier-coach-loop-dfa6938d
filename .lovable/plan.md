

## Plano: Garantir que a tela de vinculação com coach sempre apareça

### Problema
Quando o atleta vem do diagnóstico gratuito, o coach é auto-vinculado via localStorage e `coachAutoLinked = true`. Isso faz com que os botões nas telas `profileCta` e `profileConfig` pulem direto para `handleFinish()`, sem nunca mostrar a tela de seleção/confirmação do coach.

### Solução
Na tela `profileCta`, o botão deve **sempre** avançar para `setStep('coach')`, independente de `coachAutoLinked`. O auto-link do localStorage já garante que o coach estará vinculado — a tela `coach` serve como confirmação visual para o atleta saber quem é seu treinador.

### Alteração

**`src/components/WelcomeScreen.tsx`**
1. Linha 923: mudar `coachAutoLinked ? handleFinish() : setStep('coach')` para `setStep('coach')`
2. Linhas 1257-1260: mesmo ajuste — sempre `setStep('coach')`
3. Na tela `coach` (`OnboardingCoachSelection`), se já houver coach auto-vinculado, mostrar confirmação em vez de busca (isso já pode estar implementado no componente)

Resultado: o atleta sempre vê a tela do coach antes de finalizar, seja para confirmar o auto-vinculado ou para escolher um novo.

