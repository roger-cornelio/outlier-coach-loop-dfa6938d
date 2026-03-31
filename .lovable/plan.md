

## Plano: Inverter ordem — profileConfig antes de profile/profileGoal

### Problema
O fluxo atual vai: `cta` → `profile` (experiência) → `profileGoal` (objetivo) → `profileConfig` (biometria) → `profileCta` → `planSelection` → `coach`

Biometria é dado simples e concreto. Perguntas sobre experiência e objetivo são mais subjetivas. UX melhor: começar pelo fácil.

### Nova ordem
`cta` → **`profileConfig`** (biometria: peso, altura, idade, sexo, estilo coach, tempo) → **`profile`** (experiência HYROX) → **`profileGoal`** (objetivo) → `profileCta` → `planSelection` → `coach`

### Alterações em `src/components/WelcomeScreen.tsx`

1. **Botão do step `cta`** (linha ~920): mudar `setStep('profile')` para `setStep('profileConfig')`
2. **Botão "Voltar" do `profileConfig`**: mudar para `setStep(summary ? 'cta' : 'search')` (volta pro CTA ou busca)
3. **Botão "Continuar" do `profileConfig`**: mudar de `setStep('profileCta')` para `setStep('profile')`
4. **Botão "Voltar" do `profile`** (experiência): mudar para `setStep('profileConfig')`
5. **Botão "Voltar" do `profileGoal`**: manter `setStep('profile')` (sem mudança)
6. **Botão "Continuar" do `profileGoal`**: mudar de `setStep('profileConfig')` para `setStep('profileCta')`
7. **Botão "Voltar" do `profileCta`**: mudar de `setStep('profileConfig')` para `setStep('profileGoal')`

### Resultado
Fluxo: CTA → Biometria (fácil) → Experiência → Objetivo → CTA final → Plano → Coach

