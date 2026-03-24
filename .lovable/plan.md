

## Plano: Coach do Diagnóstico → Vinculação Automática (sem sobrescrever coach existente)

### Situação Atual

1. No diagnóstico gratuito, ao clicar num coach, salva `outlier_selected_coach` no localStorage e redireciona para `/login?mode=signup` (forçando cadastro)
2. No WelcomeScreen, o `outlier_selected_coach` **não é consumido** — o atleta precisa escolher coach de novo no step `coach`
3. Não existe proteção contra sobrescrever um coach já vinculado

### O que muda

**1. Redirecionamento inteligente (`DiagnosticoGratuito.tsx`)**

Ao clicar no coach, redirecionar para `/login` (sem `?mode=signup`). Assim, quem já tem conta vê login por padrão; quem é novo clica em "Criar conta".

**2. Auto-vinculação no WelcomeScreen (`WelcomeScreen.tsx`)**

Ao montar, verificar se existe `outlier_selected_coach` no localStorage:
- **Se SIM e o atleta NÃO tem coach** (`profile.coach_id` é null): vincular automaticamente (insert em `coach_athletes` + update `profiles.coach_id`) e pular o step `coach`, indo direto para `handleFinish`
- **Se SIM e o atleta JÁ tem coach**: ignorar o localStorage, não sobrescrever. O atleta segue o fluxo normal
- **Se NÃO**: fluxo normal, step `coach` aparece normalmente
- Limpar `outlier_selected_coach` do localStorage após consumo (ou descarte)

**3. Proteção no OnboardingCoachSelection**

Nenhuma mudança necessária — esse componente já só aparece no onboarding de novos atletas. A proteção contra sobrescrita fica no WelcomeScreen.

### Regra de negócio

- Coach do diagnóstico gratuito só é vinculado se o atleta **não tem coach cadastrado**
- Troca de coach só acontece dentro de Configurações (fluxo existente, sem alteração)

### Arquivos afetados

1. `src/pages/DiagnosticoGratuito.tsx` — trocar `/login?mode=signup` por `/login`
2. `src/components/WelcomeScreen.tsx` — adicionar useEffect que consome `outlier_selected_coach`, verifica `profile.coach_id`, vincula se null, e pula step coach

### O que NÃO muda

- Componente `OnboardingCoachSelection` (mesma UI)
- Fluxo de troca de coach em Configurações
- Schema do banco (zero migrations)
- RLS policies existentes

