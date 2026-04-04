

## Plano: Adaptar CTA de nível para atletas sem prova

### Problema
Atletas que indicaram no onboarding que nunca fizeram HYROX veem o botão "Descubra seu nível OUTLIER — Importamos automaticamente sua última prova HYROX", que vai falhar e mostrar "Faça uma prova HYROX para desbloquear". Isso é frustrante e inútil.

### Solução
Substituir o CTA por uma versão contextual:
- **Com prova** (onboarding_experience = `1race` ou `2plus`): mantém o CTA atual de importação
- **Sem prova** (experience = `never` ou `spectator`, ou sem dados): mostrar CTA alternativo que direciona ao **Simulador HYROX** para estabelecer um nível OUTLIER provisório baseado no simulado

### Mudanças

**1. `src/components/DiagnosticRadarBlock.tsx`**
- No componente `ImportProvaInlineCTA`, ler `profile.onboarding_experience` do `useAuth()`
- Se `experience` for `never` ou `spectator` (ou null): renderizar CTA alternativo:
  - Ícone: `Zap` ou `Timer`
  - Título: **"Avalie seu nível OUTLIER"**
  - Subtítulo: "Faça um simulado para descobrir sua classificação"
  - Nota: "Sem prova oficial? O simulado define seu nível provisório"
  - Ao clicar: disparar evento `outlier:open-simulator` (ou navegar para aba do simulador)
- Se `experience` for `1race` ou `2plus`: manter CTA atual de importação

**2. Dashboard (listener)** — Garantir que o clique no CTA alternativo abre o simulador (já existe `SimulatorScreen` no app)

### Resultado
- Atleta sem prova → vê CTA para simulado → faz simulado → recebe nível provisório
- Atleta com prova → fluxo atual de importação automática

