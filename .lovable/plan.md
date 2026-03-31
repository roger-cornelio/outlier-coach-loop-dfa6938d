

## Plano: Tela de seleção de plano no onboarding

### Alterações em `src/components/WelcomeScreen.tsx`

**1. Tipo e estado**
- Adicionar `'planSelection'` ao `OnboardingStep`
- Novo state: `selectedPlan: 'open' | 'pro' | null`

**2. Navegação**
- `profileCta` botão → `setStep('planSelection')`
- `planSelection` botão CONTINUAR → `setStep('coach')`
- `coach` onBack → `setStep('planSelection')`

**3. Nova tela `planSelection`**

Headline: **ESCOLHA SUA EXPERIÊNCIA**
Sub: "Acesso completo à plataforma em ambos os planos."

**Card ESSENCIAL** (open)
- Tagline grande e bold: **"Seu treino. Seus dados. Sua evolução."**
- Subtítulo: "Treino inteligente que ataca seus pontos fracos"
- Bullets:
  - Programação semanal personalizada pelo seu coach
  - Diagnóstico de performance baseado em dados reais
  - Treinos adaptados às suas fraquezas identificadas
  - Acompanhamento de evolução e benchmarks
  - Acesso completo: simulador, análises e métricas

**Card PERFORMANCE** (pro) — badge "RECOMENDADO"
- Tagline grande e bold: **"Pra quem quer ir além."**
- Subtítulo: "Evolução acelerada com foco cirúrgico nos seus gaps"
- Bullets:
  - Tudo do Essencial +
  - Periodização avançada e individualizada
  - Treinos que atacam suas deficiências com precisão máxima
  - Acompanhamento próximo do coach com feedbacks detalhados
  - Análise aprofundada dos seus pontos de melhoria
  - Prioridade no suporte e ajustes de treino

Botão "CONTINUAR" (ativo só com plano selecionado)
Botão "← Voltar" → `setStep('profileCta')`

**4. Persistência**
- No `handleFinish`, incluir `training_level: selectedPlan || 'open'` no update do profiles

### Hierarquia visual dos cards
1. **Tagline** — texto grande, bold, destaque máximo (text-2xl/3xl)
2. **Subtítulo** — texto médio, cor muted (text-base)
3. **Bullets** — texto menor, lista com ícones check

